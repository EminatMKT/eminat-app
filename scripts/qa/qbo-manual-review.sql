\set ON_ERROR_STOP on
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
CREATE FUNCTION pg_temp.reject_review_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.action='qbo_manual_review_required' THEN RAISE EXCEPTION 'QA_REVIEW_AUDIT_FAILURE'; END IF;
 RETURN NEW;
END $$;
DO $$
DECLARE o uuid:=gen_random_uuid();u uuid:=gen_random_uuid();au uuid:=gen_random_uuid();e uuid:=gen_random_uuid();e2 uuid:=gen_random_uuid();before_row jsonb;after_row jsonb;BEGIN
 INSERT INTO auth.users(id) VALUES(au);
 INSERT INTO usuarios(id,auth_id,email,nombre,apellido,rol,activo,validado) VALUES(u,au,'review-qa@example.invalid','Synthetic','Review','admin',true,true);
 INSERT INTO sales_organizations(id,code,name,status,approved_by,approved_at) VALUES(o,'qa-review','Synthetic review test','active',u,now());
 INSERT INTO sales_qbo_connections(organization_id,environment,realm_id,home_currency) VALUES(o,'sandbox','999000111222333','USD');
 INSERT INTO sales_qbo_webhook_events(id,organization_id,environment,realm_id,event_fingerprint,entity_type,entity_id,operation,status,attempts)
 VALUES(e,o,'sandbox','999000111222333',repeat('a',64),'Payment','999','Void','RETRY',3),
 (e2,o,'sandbox','999000111222333',repeat('b',64),'Payment','998','Void','RETRY',3);
 SELECT to_jsonb(x)-ARRAY['status','processed_at','review_reason','review_required_at'] INTO before_row FROM sales_qbo_webhook_events x WHERE id=e;
 IF native_sales_qbo_require_review(o,'sandbox',e,2,'UNLINKED_VOIDED_PAYMENT','{"paymentId":"999"}') THEN RAISE EXCEPTION 'STALE_ATTEMPT_ALLOWED'; END IF;
 IF native_sales_qbo_require_review(gen_random_uuid(),'sandbox',e,3,'UNLINKED_VOIDED_PAYMENT','{}') OR native_sales_qbo_require_review(o,'production',e,3,'UNLINKED_VOIDED_PAYMENT','{}') THEN RAISE EXCEPTION 'FOREIGN_SCOPE_ALLOWED'; END IF;
 IF NOT native_sales_qbo_require_review(o,'sandbox',e,3,'UNLINKED_VOIDED_PAYMENT','{"paymentId":"999","paymentTotalCents":0,"invoiceIds":[]}') THEN RAISE EXCEPTION 'REVIEW_NOT_RECORDED'; END IF;
 IF NOT native_sales_qbo_require_review(o,'sandbox',e,3,'UNLINKED_PAYMENT','{"paymentId":"changed"}') THEN RAISE EXCEPTION 'REPLAY_FAILED'; END IF;
 IF (SELECT count(*) FROM sales_history WHERE record_id=e AND action='qbo_manual_review_required')<>1 OR NOT EXISTS(SELECT 1 FROM sales_qbo_webhook_events WHERE id=e AND status='MANUAL_REVIEW' AND review_reason='UNLINKED_VOIDED_PAYMENT' AND review_required_at IS NOT NULL) THEN RAISE EXCEPTION 'TERMINAL_AUDIT_NOT_IDEMPOTENT'; END IF;
 IF (SELECT changes->'evidence'->>'paymentId' FROM sales_history WHERE record_id=e AND action='qbo_manual_review_required')<>'999' THEN RAISE EXCEPTION 'REPLAY_REPLACED_EVIDENCE'; END IF;
 SELECT to_jsonb(x)-ARRAY['status','processed_at','review_reason','review_required_at'] INTO after_row FROM sales_qbo_webhook_events x WHERE id=e;
 IF before_row<>after_row THEN RAISE EXCEPTION 'EVENT_EVIDENCE_CHANGED'; END IF;
 IF EXISTS(SELECT 1 FROM sales_qbo_webhook_events WHERE id=e AND status IN ('PENDING','RETRY')) THEN RAISE EXCEPTION 'TERMINAL_EVENT_REPOLLABLE'; END IF;
 EXECUTE 'CREATE TRIGGER qa_fail_review_audit BEFORE INSERT ON sales_history FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_review_audit()';
 BEGIN PERFORM native_sales_qbo_require_review(o,'sandbox',e2,3,'UNLINKED_VOIDED_PAYMENT','{}'); RAISE EXCEPTION 'FAILED_AUDIT_COMMITTED';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'QA_REVIEW_AUDIT_FAILURE' THEN RAISE; END IF; END;
 IF NOT EXISTS(SELECT 1 FROM sales_qbo_webhook_events WHERE id=e2 AND status='RETRY' AND review_reason IS NULL) OR EXISTS(SELECT 1 FROM sales_history WHERE record_id=e2 AND action='qbo_manual_review_required') THEN RAISE EXCEPTION 'AUDIT_FAILURE_NOT_ATOMIC'; END IF;
 EXECUTE 'DROP TRIGGER qa_fail_review_audit ON sales_history';
 BEGIN UPDATE sales_qbo_webhook_events SET status='MANUAL_REVIEW' WHERE id=e2;RAISE EXCEPTION 'MISSING_REVIEW_METADATA_ALLOWED';EXCEPTION WHEN check_violation THEN NULL;END;
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 BEGIN PERFORM native_sales_qbo_require_review(o,'sandbox',e2,3,'UNLINKED_PAYMENT','{}');RAISE EXCEPTION 'BROWSER_REVIEW_ALLOWED';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM set_config('request.jwt.claim.role','service_role',true);
 BEGIN PERFORM native_sales_qbo_require_review(o,'sandbox',e2,3,'UNLINKED_PAYMENT','{"accessToken":"forbidden-test-field"}');RAISE EXCEPTION 'SECRET_PAYLOAD_ALLOWED';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 IF EXISTS(SELECT 1 FROM sales_payments WHERE organization_id=o) OR EXISTS(SELECT 1 FROM sales_memberships WHERE organization_id=o) THEN RAISE EXCEPTION 'REVIEW_CREATED_FINANCIAL_OR_MEMBERSHIP_ROW'; END IF;
 RAISE NOTICE 'PASS review state/audit atomicity, replay evidence preservation, stale/tenant/environment/auth denials, safe payload and no financial changes';
END $$;
ROLLBACK;
