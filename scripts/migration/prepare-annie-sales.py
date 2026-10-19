#!/usr/bin/env python3
"""Prepare an ANNIE Sales snapshot for private, reviewed LILLY staging.

This tool never connects to either database. It writes private, normalized
JSONL and binary artifacts. Production loading and identity activation are
separate guarded steps.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import uuid


ROLE = {"OPERATOR": "SELLER"}
SOURCE_TO_DEST = {
    "Organization": "sales_organizations", "SalesTeam": "sales_teams",
    "Pipeline": "sales_pipelines", "Stage": "sales_stages",
    "Lead": "sales_leads", "Contact": "sales_contacts",
    "Account": "sales_accounts", "AccountContact": "sales_account_contacts",
    "Opportunity": "sales_opportunities", "OpportunityContact": "sales_opportunity_contacts",
    "LeadConversion": "sales_lead_conversions", "SalesPayment": "sales_payments",
    "ProgramMembership": "sales_memberships", "MembershipPeriod": "sales_membership_periods",
    "ActivityTask": "sales_activities", "ActivityMeeting": "sales_meetings",
}


def fail(message):
    raise ValueError(message)


def require_ref(value, ids, table, field):
    if value is not None and value not in ids:
        fail(f"{table}.{field} references a missing source row")


def copy_fields(row, mapping):
    return {dest: row.get(source) for source, dest in mapping.items()}


def date(value):
    return value[:10] if isinstance(value, str) else value


def load_snapshot(path):
    tables = {}
    header = None
    for raw in path.open(encoding="utf-8"):
        item = json.loads(raw)
        if item.get("kind") == "header":
            if header is not None:
                fail("duplicate snapshot header")
            header = item
        elif item.get("kind") == "table":
            name = item.get("name")
            if name in tables or not isinstance(item.get("rows"), list):
                fail("duplicate or malformed source table")
            tables[name] = item["rows"]
        else:
            fail("unknown snapshot record")
    required = set(SOURCE_TO_DEST) | {"Principal", "Membership", "MembershipTeam", "CrmHistory", "AuditEvent"}
    if header is None or not required <= tables.keys():
        fail("incomplete ANNIE snapshot")
    if not re.fullmatch(r"2026\.10\.18-lilly-sales-absorption-[0-9a-f]+", header.get("release", "")):
        fail("unreviewed ANNIE release")
    for name, rows in tables.items():
        ids = [row.get("id") for row in rows if "id" in row]
        if len(ids) != len(set(ids)):
            fail(f"duplicate source id in {name}")
    return header, tables


def normalize(tables, pdf_dir):
    source_ids = {name: {row["id"] for row in rows if "id" in row} for name, rows in tables.items()}
    principal = {row["id"]: row for row in tables["Principal"]}
    memberships = {row["id"]: row for row in tables["Membership"]}
    if len({m["principalId"] for m in memberships.values()}) != len(memberships):
        fail("ANNIE Principal has multiple staff memberships")
    organization = tables["Organization"]
    if len(organization) != 1:
        fail("expected one reviewed ANNIE Sales organization")
    org_id = organization[0]["id"]
    result = {name: [] for name in SOURCE_TO_DEST.values()}
    result.update({"sales_members": [], "sales_team_members": [],
                   "sales_household_members": [], "sales_history": [],
                   "__post_contact_primary": []})
    pdfs = []

    def append(table, row):
        if "id" in row and table not in {"sales_team_members"}:
            row.setdefault("legacy_annie_id", row["id"])
        result[table].append(row)

    o = organization[0]
    append("sales_organizations", dict(id=o["id"], code=o["code"], name=o["name"],
                                       status="pending", created_at=o["createdAt"], updated_at=o["updatedAt"]))
    for m in memberships.values():
        p = principal.get(m["principalId"])
        if p is None or m["organizationId"] != org_id:
            fail("staff Principal or organization missing")
        display = " ".join(filter(None, [(p.get("firstName") or "").strip(),
                                         (p.get("lastName") or "").strip()])) or "ANNIE historical staff"
        result["sales_members"].append(dict(
            id=p["id"], organization_id=org_id, user_id=None, auth_id=None,
            role=ROLE.get(m["role"], m["role"]), legacy_annie_principal_id=p["id"],
            display_name=display, status="historical", evidence_ref="reviewed ANNIE export"))
    for row in tables["MembershipTeam"]:
        m = memberships.get(row["membershipId"])
        if m is None:
            fail("MembershipTeam membership missing")
        require_ref(row["externalTeamId"], source_ids["SalesTeam"], "MembershipTeam", "externalTeamId")
        result["sales_team_members"].append(dict(organization_id=org_id,
            team_id=row["externalTeamId"], member_id=m["principalId"]))

    for row in tables["SalesTeam"]:
        append("sales_teams", dict(id=row["id"], organization_id=org_id,
            name=row["name"], active=row["active"], created_at=row["createdAt"]))
    for row in tables["Pipeline"]:
        append("sales_pipelines", dict(id=row["id"], organization_id=org_id,
            code=row["code"], name=row["label"], version=row["version"],
            created_at=row.get("updatedAt")))
    for row in tables["Stage"]:
        require_ref(row["pipelineId"], source_ids["Pipeline"], "Stage", "pipelineId")
        append("sales_stages", dict(id=row["id"], organization_id=org_id,
            pipeline_id=row["pipelineId"], code=row["code"], name=row["label"],
            position=row["position"], probability=row["probability"],
            outcome=row["outcome"].upper()))

    common = dict(id="id", ownerProfileId="owner_member_id", teamId="team_id",
        version="version", createdBy="created_by", updatedBy="updated_by",
        createdAt="created_at", updatedAt="updated_at", archivedAt="archived_at",
        nextFollowUpAt="next_follow_up_at")
    for source, table, mapping in [
        ("Lead", "sales_leads", dict(displayName="display_name", firstName="first_name",
            lastName="last_name", companyName="company_name", title="title", email="email",
            phone="phone", website="website", industry="industry", address="address",
            description="description", doNotCall="do_not_call", doNotEmail="do_not_email",
            status="status", source="source", sourceDetail="source_detail",
            dateOfBirth="date_of_birth", insurance="insurance", corazonSalud="corazon_salud",
            plan="plan", product="product", nextAction="next_action", convertedAt="converted_at")),
        ("Contact", "sales_contacts", dict(displayName="display_name", firstName="first_name",
            lastName="last_name", title="title", email="email", phone="phone", address="address",
            description="description", doNotCall="do_not_call", doNotEmail="do_not_email",
            dateOfBirth="date_of_birth", insurance="insurance", corazonSalud="corazon_salud",
            plan="plan", product="product", nextAction="next_action")),
        ("Account", "sales_accounts", dict(name="name", tradeName="trade_name",
            website="website", industry="industry", phone="phone", email="email",
            billingAddress="billing_address", shippingAddress="shipping_address",
            description="description", type="type"))]:
        for row in tables[source]:
            item = copy_fields(row, common | mapping)
            item["organization_id"] = org_id
            for field in ("owner_member_id", "created_by", "updated_by"):
                require_ref(item[field], source_ids["Principal"], source, field)
            require_ref(item["team_id"], source_ids["SalesTeam"], source, "teamId")
            append(table, item)

    for row in tables["AccountContact"]:
        require_ref(row["accountId"], source_ids["Account"], "AccountContact", "accountId")
        require_ref(row["contactId"], source_ids["Contact"], "AccountContact", "contactId")
        append("sales_account_contacts", dict(organization_id=org_id,
            account_id=row["accountId"], contact_id=row["contactId"], role=row["role"],
            is_primary=row["isPrimary"], active=row["active"], legacy_annie_id=row["id"]))
    for row in tables["Opportunity"]:
        item = copy_fields(row, common | dict(name="name", accountId="account_id",
            primaryContactId="primary_contact_id", stageId="stage_id", probability="probability",
            currency="currency", amount="amount", expectedCloseDate="expected_close_date",
            actualCloseDate="actual_close_date", lostReason="lost_reason",
            description="description", source="source", product="product"))
        item["organization_id"] = org_id
        for field, source in (("owner_member_id", "Principal"), ("created_by", "Principal"),
            ("updated_by", "Principal"), ("team_id", "SalesTeam"), ("account_id", "Account"),
            ("primary_contact_id", "Contact"), ("stage_id", "Stage")):
            require_ref(item[field], source_ids[source], "Opportunity", field)
        append("sales_opportunities", item)
    for row in tables["OpportunityContact"]:
        require_ref(row["opportunityId"], source_ids["Opportunity"], "OpportunityContact", "opportunityId")
        require_ref(row["contactId"], source_ids["Contact"], "OpportunityContact", "contactId")
        append("sales_opportunity_contacts", dict(organization_id=org_id,
            opportunity_id=row["opportunityId"], contact_id=row["contactId"],
            role=row["role"], legacy_annie_id=row["id"]))
    for row in tables["Contact"]:
        require_ref(row.get("primaryAccountId"), source_ids["Account"], "Contact", "primaryAccountId")
        if row.get("primaryAccountId"):
            # Applied after Accounts load to avoid the Account/Contact FK cycle.
            result["__post_contact_primary"].append(dict(
                contact_id=row["id"], primary_account_id=row["primaryAccountId"]))
    for row in tables["LeadConversion"]:
        for field, source in (("leadId", "Lead"), ("accountId", "Account"),
            ("contactId", "Contact"), ("opportunityId", "Opportunity")):
            require_ref(row.get(field), source_ids[source], "LeadConversion", field)
        append("sales_lead_conversions", copy_fields(row, dict(id="id", leadId="lead_id",
            accountId="account_id", contactId="contact_id", opportunityId="opportunity_id",
            idempotencyKey="idempotency_key", payloadHash="payload_hash",
            createdAt="created_at")) | {"organization_id": org_id})

    for row in tables["SalesPayment"]:
        require_ref(row["opportunityId"], source_ids["Opportunity"], "SalesPayment", "opportunityId")
        for key in ("ownerProfileId", "createdBy"):
            require_ref(row[key], source_ids["Principal"], "SalesPayment", key)
        append("sales_payments", dict(id=row["id"], organization_id=org_id,
            opportunity_id=row["opportunityId"], owner_member_id=row["ownerProfileId"],
            team_id=row["teamId"], amount=row["amount"], currency=row["currency"],
            paid_at=date(row["paidAt"]), reference=row["reference"],
            idempotency_key=row["idempotencyKey"], created_by=row["createdBy"],
            created_at=row["createdAt"]))

    for row in tables["ProgramMembership"]:
        for key, source in (("contactId", "Contact"), ("opportunityId", "Opportunity"),
            ("salesPaymentId", "SalesPayment"), ("sellerProfileId", "Principal"),
            ("createdBy", "Principal"), ("teamId", "SalesTeam")):
            require_ref(row.get(key), source_ids[source], "ProgramMembership", key)
        modality = row.get("modality")
        mtype = "INDIVIDUAL" if modality == "INDIVIDUAL" else "LEGACY_UNSPECIFIED"
        plan = row.get("plan") if row.get("plan") in {"ESSENTIAL", "PLUS", "MAX"} else "LEGACY_UNSPECIFIED"
        duration = row.get("duration") if row.get("duration") in {"2M", "3M", "6M", "12M", "MONTHLY"} else "LEGACY_UNSPECIFIED"
        append("sales_memberships", dict(id=row["id"], organization_id=org_id,
            code=row["code"], code_number=row["codeNumber"], primary_contact_id=row["contactId"],
            opportunity_id=row["opportunityId"], sales_payment_id=row["salesPaymentId"],
            first_name=row["firstName"], last_name=row["lastName"], phone=row["phone"],
            email=row["email"], address=row["address"], membership_type=mtype,
            plan=plan, duration=duration, legacy_membership_type_label=row["membershipType"],
            legacy_plan_label=row.get("plan"), legacy_duration_label=row.get("duration"),
            legacy_modality_label=modality, monthly_price_cents=row["monthlyPriceCents"],
            total_price_cents=row["totalPriceCents"], visit_fee_cents=row["visitFeeCents"],
            included_visits=row["includedVisits"], issued_at=date(row["issuedAt"]),
            expires_at=date(row["expiresAt"]), status=row["status"],
            seller_member_id=row["sellerProfileId"], team_id=row["teamId"],
            sale_date=date(row["saleDate"]), amount=row["amount"], currency=row["currency"],
            payment_reference=row["paymentReference"], payment_confirmed_at=row["paymentConfirmedAt"],
            is_demo=row["is_demo"], pdf_storage_key=None, pdf_version=row["pdfVersion"],
            pdf_generated_at=row["pdfGeneratedAt"], cancelled_at=row["cancelledAt"],
            created_by=row["createdBy"], created_at=row["createdAt"],
            updated_at=row["updatedAt"], version=row["version"]))
        household_id = str(uuid.uuid5(uuid.NAMESPACE_URL, "annie-household-primary:" + row["id"]))
        result["sales_household_members"].append(dict(id=household_id, organization_id=org_id,
            membership_id=row["id"], contact_id=row["contactId"], relationship="PRIMARY",
            status="ACTIVE", member_index=1, legacy_annie_id=None))
        for field, suffix in (("pdfBytes", "membership"), ("agreementPdfBytes", "agreement")):
            encoded = row.get(field)
            if not encoded:
                continue
            if not isinstance(encoded, str) or not encoded.startswith("\\x"):
                fail("unexpected PDF byte encoding")
            blob = bytes.fromhex(encoded[2:])
            if not blob.startswith(b"%PDF-"):
                fail("invalid source PDF signature")
            filename = f"{row['id']}-{suffix}.pdf"
            target = pdf_dir / filename
            target.write_bytes(blob)
            os.chmod(target, 0o600)
            pdfs.append(dict(membershipId=row["id"], kind=suffix, filename=filename,
                             bytes=len(blob), sha256=hashlib.sha256(blob).hexdigest()))

    for row in tables["MembershipPeriod"]:
        require_ref(row["membershipId"], source_ids["ProgramMembership"], "MembershipPeriod", "membershipId")
        append("sales_membership_periods", dict(id=row["id"], organization_id=org_id,
            membership_id=row["membershipId"], starts_at=date(row["startsAt"]),
            expires_at=date(row["expiresAt"]),
            plan=row["plan"] if row["plan"] in {"ESSENTIAL", "PLUS", "MAX"} else "LEGACY_UNSPECIFIED",
            duration=row["duration"] if row["duration"] in {"2M", "3M", "6M", "12M", "MONTHLY"} else "LEGACY_UNSPECIFIED",
            amount_cents=row["amountCents"], legacy_plan_label=row["plan"],
            legacy_duration_label=row["duration"], legacy_modality_label=row["modality"],
            created_at=row["createdAt"]))

    for row in tables["ActivityTask"]:
        for key, source in (("creatorId", "Principal"), ("assigneeId", "Principal"),
            ("leadId", "Lead"), ("contactId", "Contact"), ("accountId", "Account"),
            ("opportunityId", "Opportunity")):
            require_ref(row.get(key), source_ids[source], "ActivityTask", key)
        body = "\n\n".join(filter(None, [row.get("description"), row.get("notes")])) or None
        append("sales_activities", dict(id=row["id"], organization_id=org_id,
            kind="TASK", title=row["title"], body=body, status=row["status"],
            priority=row["priority"], actor_member_id=row["creatorId"],
            assignee_member_id=row["assigneeId"], lead_id=row["leadId"],
            contact_id=row["contactId"], account_id=row["accountId"],
            opportunity_id=row["opportunityId"], due_at=row["dueAt"],
            completed_at=row["completedAt"], idempotency_key=row["idempotencyKey"],
            version=row["version"], created_at=row["createdAt"], updated_at=row["updatedAt"]))
    for row in tables["ActivityMeeting"]:
        for key, source in (("organizerId", "Principal"), ("assigneeId", "Principal"),
            ("leadId", "Lead"), ("contactId", "Contact"), ("accountId", "Account"),
            ("opportunityId", "Opportunity")):
            require_ref(row.get(key), source_ids[source], "ActivityMeeting", key)
        append("sales_meetings", dict(id=row["id"], organization_id=org_id,
            title=row["title"], description=row["description"],
            organizer_member_id=row["organizerId"], assignee_member_id=row["assigneeId"],
            participants=row["participants"], start_at=row["startAt"], end_at=row["endAt"],
            timezone=row["timezone"], location=row["location"], virtual_url=row["virtualUrl"],
            lead_id=row["leadId"], contact_id=row["contactId"], account_id=row["accountId"],
            opportunity_id=row["opportunityId"], notes=row["notes"], outcome=row["outcome"],
            status=row["status"], version=row["version"], created_at=row["createdAt"],
            updated_at=row["updatedAt"]))

    entity = {"leads": "lead", "contacts": "contact", "accounts": "account",
              "opportunities": "opportunity", "tasks": "activity", "meetings": "meeting",
              "interactions": "interaction"}
    for source in ("CrmHistory", "AuditEvent"):
        for row in tables[source]:
            require_ref(row.get("actorId"), source_ids["Principal"], source, "actorId")
            append("sales_history", dict(id=row["id"], organization_id=org_id,
                entity_type=entity.get(row["entityType"], row["entityType"]),
                record_id=row["recordId"], actor_member_id=row["actorId"],
                action=row["action"], request_id=row["requestId"],
                occurred_at=row["occurredAt"], changes=row["changes"]))
    return result, pdfs


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    if ".local" not in args.output_dir.resolve().parts:
        fail("private output must be inside an ignored .local directory")
    if args.output_dir.exists():
        fail("output directory already exists; no overwrite")
    args.output_dir.mkdir(mode=0o700, parents=True)
    os.chmod(args.output_dir, 0o700)
    pdf_dir = args.output_dir / "pdfs"
    pdf_dir.mkdir(mode=0o700)
    header, tables = load_snapshot(args.snapshot)
    rows, pdfs = normalize(tables, pdf_dir)
    bundle = args.output_dir / "rows.ndjson"
    digest = hashlib.sha256()
    with bundle.open("w", encoding="utf-8") as stream:
        os.chmod(bundle, 0o600)
        for table, values in rows.items():
            for row in values:
                payload = json.dumps({"table": table, "row": row}, sort_keys=True, separators=(",", ":")) + "\n"
                stream.write(payload)
                digest.update(payload.encode())
    manifest = {"sourceRelease": header["release"], "sourceSnapshotAt": header["snapshotAt"],
        "sourceCounts": {name: len(values) for name, values in tables.items()},
        "destinationCounts": {name: len(values) for name, values in rows.items()},
        "rowsSha256": digest.hexdigest(), "pdfArtifacts": pdfs,
        "identityState": "historical only; no login bindings or organization activation",
        "productionLoaded": False}
    manifest_path = args.output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.chmod(manifest_path, 0o600)
    # Only aggregate counts and hashes are printed. No source rows or PII.
    print(json.dumps({"destinationCounts": manifest["destinationCounts"],
                      "rowsSha256": manifest["rowsSha256"], "pdfCount": len(pdfs)}, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, json.JSONDecodeError) as error:
        print(f"ANNIE_MIGRATION_PREP_FAILED: {type(error).__name__}", file=sys.stderr)
        sys.exit(1)
