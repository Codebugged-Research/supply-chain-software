import unittest
from generators.validation_engine import ValidationEngine, ValidationResult
from generators.reference_manager import ReferenceManager
from generators.llm_enrichment_service import LLMEnrichmentService


class TestValidationEngine(unittest.TestCase):

    def setUp(self):
        self.val_engine = ValidationEngine()
        self.ref_mgr = ReferenceManager()

        # Seed reference manager with basic test data
        self.ref_mgr.register("product_master", "SKU-TEST-001", {
            "skuCode": "SKU-TEST-001",
            "skuName": "Test Product",
            "category": "TWS",
            "brand": "boAt",
            "status": "ACTIVE"
        })
        self.ref_mgr.register("supplier_master", "SUP-TEST-001", {
            "supplierCode": "SUP-TEST-001",
            "supplierName": "Test Supplier",
            "country": "IN",
            "city": "Noida",
            "rating": 4.5,
            "status": "APPROVED"
        })
        self.ref_mgr.register("plant_master", "PLANT-TEST-01", {
            "plantCode": "PLANT-TEST-01",
            "plantName": "Noida Plant 1",
            "country": "IN",
            "workingDays": 6,
            "dailyCapacity": 10000,
            "weeklyCapacity": 60000,
            "status": "ACTIVE"
        })
        self.ref_mgr.register("warehouse_master", "WH-TEST-01", {
            "warehouseCode": "WH-TEST-01",
            "warehouseName": "Delhi DC",
            "warehouseType": "CENTRAL_DC",
            "country": "IN",
            "capacityUnits": 100000,
            "status": "ACTIVE"
        })

    def test_category_1_schema_validation(self):
        # Valid schema
        records = [{
            "skuCode": "SKU-TEST-001",
            "skuName": "Test Product",
            "category": "TWS",
            "brand": "boAt",
            "status": "ACTIVE"
        }]
        res = self.val_engine.validate_schema("product_master", records)
        self.assertTrue(res.is_valid)

        # Invalid schema (missing required field + bad enum)
        bad_records = [{
            "skuCode": "SKU-TEST-001",
            "status": "INVALID_STATUS"
        }]
        res_bad = self.val_engine.validate_schema("product_master", bad_records)
        self.assertFalse(res_bad.is_valid)
        self.assertTrue(any("Mandatory field" in err for err in res_bad.errors))

    def test_category_2_relationship_validation(self):
        # Valid FK
        records = [{
            "skuCode": "SKU-TEST-001",
            "supplierCode": "SUP-TEST-001",
            "status": "ACTIVE"
        }]
        res = self.val_engine.validate_relationships("supplier_product_mapping", records, self.ref_mgr)
        self.assertTrue(res.is_valid)

        # Orphan FK
        orphan_records = [{
            "skuCode": "SKU-NON-EXISTENT",
            "supplierCode": "SUP-TEST-001",
            "status": "ACTIVE"
        }]
        res_orphan = self.val_engine.validate_relationships("supplier_product_mapping", orphan_records, self.ref_mgr)
        self.assertFalse(res_orphan.is_valid)

    def test_category_3_business_rules(self):
        # Negative Inventory (Business Error)
        records = [{
            "skuCode": "SKU-TEST-001",
            "warehouseCode": "WH-TEST-01",
            "batchNumber": "BAT-001",
            "availableQty": -50,
            "reservedQty": 0,
            "blockedQty": 0,
            "closingQty": -50
        }]
        res = self.val_engine.validate_business_rules("inventory", records, self.ref_mgr)
        self.assertFalse(res.is_valid)
        self.assertTrue(any("cannot be negative" in err for err in res.errors))

        # MRP Netting Balance Error
        sp_records = [{
            "skuCode": "SKU-TEST-001",
            "week": "2026-W01",
            "forecastQty": 100,
            "availableInventory": 50,
            "plannedProduction": 0,
            "plannedPurchase": 100,
            "projectedInventory": 999  # Should be 50 + 0 + 100 - 100 = 50
        }]
        res_sp = self.val_engine.validate_business_rules("supply_plan", sp_records, self.ref_mgr)
        self.assertFalse(res_sp.is_valid)
        self.assertTrue(any("MRP inventory equation balance error" in err for err in res_sp.errors))

    def test_category_4_cross_collection_validation(self):
        # Cross collection mismatch between forecast and supply plan
        self.ref_mgr.register("consensus_forecast", "SKU-TEST-001:WH-TEST-01:2026-W01", {
            "skuCode": "SKU-TEST-001",
            "location": "WH-TEST-01",
            "week": "2026-W01",
            "forecastQty": 500
        })

        sp_mismatch = [{
            "skuCode": "SKU-TEST-001",
            "warehouseCode": "WH-TEST-01",
            "week": "2026-W01",
            "forecastQty": 9999,  # Mismatch with consensus_forecast (500)
            "availableInventory": 100,
            "plannedProduction": 0,
            "plannedPurchase": 0,
            "projectedInventory": -9899
        }]
        res = self.val_engine.validate_cross_collection("supply_plan", sp_mismatch, self.ref_mgr)
        self.assertFalse(res.is_valid)

    def test_category_5_data_quality_checks(self):
        # Duplicate primary keys
        duplicate_records = [
            {"skuCode": "SKU-DUP-01", "skuName": "Dup 1", "category": "TWS", "brand": "boAt", "status": "ACTIVE"},
            {"skuCode": "SKU-DUP-01", "skuName": "Dup 2", "category": "TWS", "brand": "boAt", "status": "ACTIVE"}
        ]
        res = self.val_engine.validate_data_quality("product_master", duplicate_records, self.ref_mgr)
        self.assertFalse(res.is_valid)
        self.assertTrue(any("Duplicate primary key" in err for err in res.errors))

    def test_category_6_llm_validation_never_fails_generation(self):
        # Disabled or failing LLM service must generate warnings but NEVER fail is_valid
        llm_offline = LLMEnrichmentService(enabled=True, api_key="")
        res = self.val_engine.validate_llm_service(llm_offline)
        self.assertTrue(res.is_valid)
        self.assertTrue(len(res.warnings) > 0)


if __name__ == '__main__':
    unittest.main()
