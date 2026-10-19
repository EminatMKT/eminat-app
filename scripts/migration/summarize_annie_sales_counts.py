#!/usr/bin/env python3
"""Emit aggregate-only destination-row categories from a verified private manifest."""

import argparse
import json
from pathlib import Path
import sys

from sales_migration_common import TABLES, load_bundle


CATEGORIES = {
    'Leads': ('sales_leads',),
    'Contacts': ('sales_contacts',),
    'Accounts': ('sales_accounts',),
    'AccountContactRelations': ('sales_account_contacts', '__post_contact_primary'),
    'Opportunities': ('sales_opportunities', 'sales_opportunity_contacts', 'sales_lead_conversions'),
    'ActivitiesHistory': ('sales_activities', 'sales_meetings', 'sales_history'),
    'Memberships': ('sales_memberships',),
    'MembershipPeriods': ('sales_membership_periods',),
    'FamilyRelations': ('sales_household_members',),
    'StaffHistoricalActors': ('sales_members',),
    'SocialRecords': (),
    'Other': ('sales_organizations', 'sales_teams', 'sales_team_members',
              'sales_pipelines', 'sales_stages', 'sales_payments'),
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('bundle', type=Path)
    parser.add_argument('--expected-bundle-sha', required=True)
    parser.add_argument('--expected-manifest-sha', required=True)
    args = parser.parse_args()
    manifest, lines = load_bundle(args.bundle.resolve(), args.expected_bundle_sha,
                                  args.expected_manifest_sha)
    counts = manifest['destinationCounts']
    expected = set(TABLES) | {'__post_contact_primary'}
    assigned = [table for tables in CATEGORIES.values() for table in tables]
    if set(assigned) != expected or len(assigned) != len(expected):
        raise ValueError('CATEGORY_COVERAGE_INVALID')
    result = {category: sum(counts[table] for table in tables)
              for category, tables in CATEGORIES.items()}
    if sum(result.values()) != len(lines) or len(lines) != 334:
        raise ValueError('AGGREGATE_COUNT_MISMATCH')
    print(json.dumps({'basis': 'normalized_destination_rows', 'counts': result,
                      'total': len(lines)}, sort_keys=True))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError, json.JSONDecodeError):
        print('SALES_COUNT_SUMMARY_FAILED', file=sys.stderr)
        sys.exit(1)
