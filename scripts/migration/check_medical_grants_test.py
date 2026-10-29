"""ACL regression: deny excess grants and preserve authorized Medical DML."""
import copy,unittest
from check_medical_grants import validate_catalog,TABLES,PRIVILEGES

def fixture(after):
    return {name:{'rls':True,'policies':1,'policy':"( SELECT has_module('medical'::text) AS has_module)",'rows':0,
        'anon':{p:not after for p in PRIVILEGES},'service_role':{p:True for p in PRIVILEGES},
        'authenticated':{p:not after or p in PRIVILEGES[:4] for p in PRIVILEGES}} for name in TABLES}
class MedicalGate(unittest.TestCase):
    def test_baseline_and_restricted_acl(self):
        validate_catalog(fixture(False));validate_catalog(fixture(True),True)
    def test_rejects_populated_table_before_change(self):
        c=fixture(False);c['pacientes']['rows']=1
        with self.assertRaises(AssertionError):validate_catalog(c)
    def test_rejects_remaining_truncate_and_lost_dml(self):
        for role,priv,value in [('authenticated','TRUNCATE',True),('anon','SELECT',True),('authenticated','INSERT',False),('service_role','UPDATE',False)]:
            c=fixture(True);c['pacientes'][role][priv]=value
            with self.assertRaises(AssertionError):validate_catalog(c,True)
    def test_rejects_rls_policy_drift(self):
        c=fixture(False);c['pacientes']['policy']='true'
        with self.assertRaises(AssertionError):validate_catalog(c)
if __name__=='__main__':unittest.main()
