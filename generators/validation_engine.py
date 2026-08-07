import re
import math
from typing import List, Dict, Any, Optional, Set
from generators.reference_manager import ReferenceManager
from generators.llm_enrichment_service import LLMEnrichmentService


class ValidationResult:
    """
    Validation Result Container for Synthetic Data Pipeline.
    Tracks deterministic errors (which fail the Quality Gate and stop generation)
    and non-fatal data quality warnings / LLM notices (which do NOT stop generation).
    """

    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        self.is_valid = True  # Flips to False ONLY for deterministic data errors
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.details: Dict[str, List[Dict[str, str]]] = {
            "schema": [],
            "relationship": [],
            "business": [],
            "cross_collection": [],
            "data_quality": [],
            "llm": []
        }

    def add_error(self, category: str, message: str):
        self.is_valid = False
        formatted_msg = f"[{category.upper()} ERROR] {message}"
        self.errors.append(formatted_msg)
        if category in self.details:
            self.details[category].append({"type": "ERROR", "message": message})

    def add_warning(self, category: str, message: str):
        formatted_msg = f"[{category.upper()} WARNING] {message}"
        self.warnings.append(formatted_msg)
        if category in self.details:
            self.details[category].append({"type": "WARNING", "message": message})

    def merge(self, other: 'ValidationResult'):
        if not other.is_valid:
            self.is_valid = False
        self.errors.extend(other.errors)
        self.warnings.extend(other.warnings)
        for cat, items in other.details.items():
            if cat in self.details:
                self.details[cat].extend(items)


class ValidationEngine:
    """
    Production-Quality 6-Category Validation Engine for Synthetic Supply Chain Data:
    
    1. Schema Validation (Required fields, Data types, Enums, Defaults)
    2. Relationship Validation (Parent exists, Child references valid, Foreign keys valid)
    3. Business Validation (Inventory, POs, Production Orders, Warehouse capacity, Forecast horizon, Supply Plan MRP)
    4. Cross Collection Validation (Inventory, Purchase Orders, Production Orders, Supply Plan agreement)
    5. Data Quality Checks (Spikes, duplicates, lead times, capacities, broken/missing references)
    6. LLM Validation (Cache check, API bypass, graceful offline handling - NEVER stops generation)
    
    RULE: Generation stops ONLY for deterministic data errors (Categories 1-5).
          LLM failures (Category 6) NEVER stop generation.
    """

    def __init__(self):
        # Mandatory fields per collection
        self.required_fields_map: Dict[str, List[str]] = {
            'product_master': ['skuCode', 'skuName', 'category', 'brand', 'status'],
            'product_planning': ['skuCode', 'planningStrategy'],
            'product_pricing': ['skuCode', 'currency', 'mrp', 'standardCost'],
            'product_logistics': ['skuCode', 'netWeightKg', 'grossWeightKg'],
            'supplier_master': ['supplierCode', 'supplierName', 'country', 'city', 'rating', 'status'],
            'supplier_product_mapping': ['supplierCode', 'skuCode', 'status'],
            'plant_master': ['plantCode', 'plantName', 'country', 'workingDays', 'dailyCapacity', 'weeklyCapacity', 'status'],
            'plant_product_mapping': ['plantCode', 'skuCode', 'productionLine', 'dailyCapacity', 'weeklyCapacity', 'status'],
            'bom_master': ['parentSku', 'componentSku', 'quantity'],
            'warehouse_master': ['warehouseCode', 'warehouseName', 'warehouseType', 'country', 'capacityUnits', 'status'],
            'customer_channel_master': ['channelCode', 'channelName', 'channelType', 'priority', 'serviceLevel', 'status'],
            'inventory': ['skuCode', 'batchNumber', 'availableQty', 'reservedQty', 'blockedQty', 'closingQty'],
            'consensus_forecast': ['skuCode', 'location', 'week', 'forecastQty', 'forecastVersion'],
            'supply_plan': ['skuCode', 'week', 'forecastQty', 'availableInventory', 'plannedProduction', 'plannedPurchase', 'projectedInventory', 'planningStatus'],
            'purchase_orders': ['poNumber', 'supplierCode', 'skuCode', 'orderedQty', 'receivedQty', 'expectedDeliveryDate', 'status'],
            'production_orders': ['productionOrderNo', 'skuCode', 'plantCode', 'plannedQty', 'producedQty', 'startDate', 'endDate', 'status'],
            'transfer_orders': ['transferOrderNo', 'skuCode', 'fromWarehouseCode', 'toWarehouseCode', 'transferQuantity', 'status'],
            'supply_constraints': ['skuCode', 'constraintType', 'constraintSource', 'severity', 'description'],
            'what_if_scenarios': ['scenarioName', 'description', 'createdBy', 'assumptionType', 'assumptionValue']
        }

        # Data type expectations per field name
        self.type_rules: Dict[str, tuple] = {
            'skuCode': (str,),
            'poNumber': (str,),
            'productionOrderNo': (str,),
            'transferOrderNo': (str,),
            'warehouseCode': (str,),
            'plantCode': (str,),
            'supplierCode': (str,),
            'channelCode': (str,),
            'week': (str,),
            'status': (str,),
            'availableQty': (int, float),
            'reservedQty': (int, float),
            'blockedQty': (int, float),
            'inTransitQty': (int, float),
            'qualityInspectionQty': (int, float),
            'openingQty': (int, float),
            'closingQty': (int, float),
            'orderedQty': (int, float),
            'receivedQty': (int, float),
            'plannedQty': (int, float),
            'producedQty': (int, float),
            'shippedQty': (int, float),
            'transferQuantity': (int, float),
            'forecastQty': (int, float),
            'plannedProduction': (int, float),
            'plannedPurchase': (int, float),
            'availableInventory': (int, float),
            'projectedInventory': (int, float),
            'dailyCapacity': (int, float),
            'weeklyCapacity': (int, float),
            'capacityUnits': (int, float),
            'leadTimeDays': (int, float),
            'moq': (int, float),
            'minOrderQty': (int, float),
            'unitCost': (int, float),
            'unitMsp': (int, float),
            'wholesalePrice': (int, float),
            'quantity': (int, float)
        }

        # Allowed Enum Values
        self.enum_rules: Dict[str, Set[str]] = {
            'status': {'ACTIVE', 'INACTIVE', 'QUALIFIED', 'DRAFT', 'CLOSED', 'CONFIRMED', 'OPEN', 'COMPLETED', 'IN_PROGRESS', 'APPROVED', 'IN_TRANSIT'},
            'warehouseType': {'CENTRAL_DC', 'REGIONAL_DC', 'PLANT_WH'},
            'channelType': {'GENERAL_TRADE', 'MODERN_TRADE', 'E_COMMERCE', 'ECOMMERCE', 'D2C', 'EXPORT'},
            'constraintType': {'CAPACITY', 'MATERIAL', 'LOGISTICS', 'DEMAND', 'SUPPLIER'},
            'severity': {'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'},
            'planningStatus': {'FEASIBLE', 'SHORTAGE', 'SURPLUS', 'CONSTRAINED'},
            'assumptionType': {'DEMAND_SURGE', 'SUPPLY_DISRUPTION', 'CAPACITY_REDUCTION', 'PRICE_CHANGE'},
            'category': {'TWS', 'WEARABLE', 'WEARABLES', 'AUDIO', 'ACCESSORIES', 'ELECTRONICS', 'ELECTRONIC COMPONENTS', 'ENERGY STORAGE', 'MATERIALS', 'COMPONENTS'}
        }

    def validate_all(
        self,
        collection_name: str,
        records: List[Dict[str, Any]],
        ref_manager: ReferenceManager,
        llm_service: Optional[LLMEnrichmentService] = None
    ) -> ValidationResult:
        """
        Executes all 6 validation categories automatically after every generator run.
        """
        result = ValidationResult(collection_name)

        result.merge(self.validate_schema(collection_name, records))
        result.merge(self.validate_relationships(collection_name, records, ref_manager))
        result.merge(self.validate_business_rules(collection_name, records, ref_manager))
        result.merge(self.validate_cross_collection(collection_name, records, ref_manager))
        result.merge(self.validate_data_quality(collection_name, records, ref_manager))
        result.merge(self.validate_llm_service(llm_service))

        return result

    # =========================================================================
    # CATEGORY 1: SCHEMA VALIDATION
    # =========================================================================
    def validate_schema(self, collection_name: str, records: List[Dict[str, Any]]) -> ValidationResult:
        result = ValidationResult(collection_name)
        optional_empty_collections = {'supply_constraints', 'what_if_scenarios'}

        if not records:
            if collection_name not in optional_empty_collections:
                result.add_error("schema", f"Collection [{collection_name}] is empty and contains no records.")
            return result

        req_fields = self.required_fields_map.get(collection_name, [])

        for i, rec in enumerate(records):
            # 1. Required Fields check
            for field in req_fields:
                if field not in rec or rec[field] is None:
                    result.add_error("schema", f"Record #{i} in [{collection_name}]: Mandatory field '{field}' is missing or null.")

            # 2. Data Types & Enums check
            for k, v in rec.items():
                if v is None:
                    continue

                # Type check
                if k in self.type_rules:
                    expected_types = self.type_rules[k]
                    if not isinstance(v, expected_types):
                        result.add_error("schema", f"Record #{i} in [{collection_name}]: Field '{k}' value '{v}' has invalid type {type(v).__name__}, expected {expected_types}.")

                # Enum check
                if k in self.enum_rules:
                    allowed = self.enum_rules[k]
                    if str(v).upper() not in allowed:
                        result.add_error("schema", f"Record #{i} in [{collection_name}]: Field '{k}' value '{v}' is not in allowed enums {allowed}.")

            # 3. Regex Pattern Checks
            if rec.get('skuCode'):
                if not re.match(r'^[A-Z0-9_-]{3,50}$', str(rec['skuCode'])):
                    result.add_error("schema", f"Record #{i}: Invalid skuCode format '{rec['skuCode']}'.")

            if rec.get('week'):
                if not re.match(r'^\d{4}-W\d{2}$', str(rec['week'])):
                    result.add_error("schema", f"Record #{i}: Invalid week format '{rec['week']}'. Expected YYYY-Www.")

            if rec.get('poNumber'):
                if not re.match(r'^PUR-[A-Z0-9_-]{5,30}$', str(rec['poNumber'])):
                    result.add_error("schema", f"Record #{i}: Invalid poNumber format '{rec['poNumber']}'.")

            if rec.get('productionOrderNo'):
                if not re.match(r'^PO-[A-Z0-9_-]{5,30}$', str(rec['productionOrderNo'])):
                    result.add_error("schema", f"Record #{i}: Invalid productionOrderNo format '{rec['productionOrderNo']}'.")

            if rec.get('transferOrderNo'):
                if not re.match(r'^TRF-[A-Z0-9_-]{5,30}$', str(rec['transferOrderNo'])):
                    result.add_error("schema", f"Record #{i}: Invalid transferOrderNo format '{rec['transferOrderNo']}'.")

        return result

    # =========================================================================
    # CATEGORY 2: RELATIONSHIP VALIDATION
    # =========================================================================
    def validate_relationships(self, collection_name: str, records: List[Dict[str, Any]], ref_manager: ReferenceManager) -> ValidationResult:
        result = ValidationResult(collection_name)

        fk_map = {
            'product_planning': [('skuCode', 'product_master')],
            'product_pricing': [('skuCode', 'product_master')],
            'product_logistics': [('skuCode', 'product_master')],
            'supplier_product_mapping': [('skuCode', 'product_master'), ('supplierCode', 'supplier_master')],
            'plant_product_mapping': [('skuCode', 'product_master'), ('plantCode', 'plant_master')],
            'bom_master': [('parentSku', 'product_master'), ('componentSku', 'product_master')],
            'inventory': [('skuCode', 'product_master')],
            'consensus_forecast': [('skuCode', 'product_master')],
            'supply_plan': [('skuCode', 'product_master')],
            'production_orders': [('skuCode', 'product_master'), ('plantCode', 'plant_master')],
            'purchase_orders': [('skuCode', 'product_master'), ('supplierCode', 'supplier_master')],
            'transfer_orders': [('skuCode', 'product_master')],
            'supply_constraints': [('skuCode', 'product_master')]
        }

        rules = fk_map.get(collection_name, [])
        for i, rec in enumerate(records):
            # Foreign Key resolution check
            for fk_field, target_coll in rules:
                val = rec.get(fk_field)
                if val and not ref_manager.exists(target_coll, str(val)):
                    result.add_error("relationship", f"Record #{i} in [{collection_name}]: Orphan foreign key {fk_field}='{val}' not found in [{target_coll}].")

            # Specific Location Foreign Keys for Inventory & Forecast
            if collection_name == 'inventory':
                wh = rec.get('warehouseCode')
                pl = rec.get('plantCode')
                if wh and not ref_manager.exists('warehouse_master', str(wh)):
                    result.add_error("relationship", f"Record #{i}: Warehouse '{wh}' not found in [warehouse_master].")
                if pl and not ref_manager.exists('plant_master', str(pl)):
                    result.add_error("relationship", f"Record #{i}: Plant '{pl}' not found in [plant_master].")

            if collection_name == 'consensus_forecast':
                loc = rec.get('location')
                if loc and not ref_manager.exists('warehouse_master', str(loc)):
                    result.add_error("relationship", f"Record #{i}: Forecast location '{loc}' not found in [warehouse_master].")

        # BOM Directed Acyclic Graph (DAG) Cycle Check
        if collection_name == 'bom_master':
            if not ref_manager.validate_bom_dag():
                result.add_error("relationship", "BOM Hierarchy contains circular dependency cycles (DAG violation).")

        return result

    # =========================================================================
    # CATEGORY 3: BUSINESS VALIDATION
    # =========================================================================
    def validate_business_rules(self, collection_name: str, records: List[Dict[str, Any]], ref_manager: ReferenceManager) -> ValidationResult:
        result = ValidationResult(collection_name)

        if collection_name == 'inventory':
            for i, rec in enumerate(records):
                # Inventory cannot be negative
                for qty_field in ['availableQty', 'reservedQty', 'blockedQty', 'inTransitQty', 'qualityInspectionQty', 'openingQty', 'closingQty']:
                    val = rec.get(qty_field, 0)
                    if val < 0:
                        result.add_error("business", f"Record #{i}: Inventory field '{qty_field}' cannot be negative (got {val}).")

                # Location requirement
                if rec.get('warehouseCode') is None and rec.get('plantCode') is None:
                    result.add_error("business", f"Record #{i}: Inventory location missing (both warehouseCode and plantCode are null).")

                # Mass balance calculation
                calc_closing = (
                    rec.get('availableQty', 0) +
                    rec.get('reservedQty', 0) +
                    rec.get('blockedQty', 0) +
                    rec.get('qualityInspectionQty', 0)
                )
                if rec.get('closingQty') != calc_closing:
                    result.add_error("business", f"Record #{i}: Mass balance failed. closingQty={rec.get('closingQty')} != calculated available+reserved+blocked+qa ({calc_closing}).")

        elif collection_name == 'purchase_orders':
            for i, rec in enumerate(records):
                sup = rec.get('supplierCode')
                sku = rec.get('skuCode')
                ordered = rec.get('orderedQty', 0)
                received = rec.get('receivedQty', 0)

                # Supplier and SKU check
                if not sup or not ref_manager.exists('supplier_master', str(sup)):
                    result.add_error("business", f"Record #{i}: Purchase order supplier '{sup}' does not exist in [supplier_master].")
                if not sku or not ref_manager.exists('product_master', str(sku)):
                    result.add_error("business", f"Record #{i}: Purchase order SKU '{sku}' does not exist in [product_master].")

                # Quantities validation
                if ordered <= 0:
                    result.add_error("business", f"Record #{i}: PO orderedQty must be > 0 (got {ordered}).")
                if received < 0 or received > ordered:
                    result.add_error("business", f"Record #{i}: PO receivedQty ({received}) must be between 0 and orderedQty ({ordered}).")

        elif collection_name == 'production_orders':
            for i, rec in enumerate(records):
                plant = rec.get('plantCode')
                sku = rec.get('skuCode')
                planned = rec.get('plannedQty', 0)
                produced = rec.get('producedQty', 0)

                # Plant and SKU check
                if not plant or not ref_manager.exists('plant_master', str(plant)):
                    result.add_error("business", f"Record #{i}: Production order plant '{plant}' does not exist in [plant_master].")
                if not sku or not ref_manager.exists('product_master', str(sku)):
                    result.add_error("business", f"Record #{i}: Production order SKU '{sku}' does not exist in [product_master].")

                if planned <= 0:
                    result.add_error("business", f"Record #{i}: Production order plannedQty must be > 0 (got {planned}).")
                if produced < 0 or produced > planned:
                    result.add_error("business", f"Record #{i}: Production order producedQty ({produced}) must be between 0 and plannedQty ({planned}).")

                # Date ordering check
                start = rec.get('startDate')
                end = rec.get('endDate')
                if start and end and start > end:
                    result.add_error("business", f"Record #{i}: Production order startDate ({start}) is after endDate ({end}).")

        elif collection_name == 'warehouse_master':
            inventory_docs = ref_manager.get_all_documents('inventory')
            wh_totals: Dict[str, float] = {}
            for inv in inventory_docs:
                w_code = inv.get('warehouseCode')
                if w_code:
                    wh_totals[w_code] = wh_totals.get(w_code, 0) + inv.get('closingQty', 0)

            for i, rec in enumerate(records):
                wh_code = rec.get('warehouseCode')
                cap = rec.get('capacityUnits', 0)
                if cap <= 0:
                    result.add_error("business", f"Record #{i}: Warehouse capacityUnits must be > 0 (got {cap}).")
                
                stored = wh_totals.get(wh_code, 0)
                if stored > cap:
                    result.add_error("business", f"Record #{i}: Warehouse '{wh_code}' capacity exceeded. Stored inventory {stored} > capacity {cap}.")

        elif collection_name == 'consensus_forecast':
            # Forecast Horizon Completeness check (Expected 52 weeks per SKU-location)
            expected_weeks = {f"2026-W{w:02d}" for w in range(1, 53)}
            sku_loc_weeks: Dict[tuple, Set[str]] = {}

            for i, rec in enumerate(records):
                sku = rec.get('skuCode')
                loc = rec.get('location')
                w = rec.get('week')
                qty = rec.get('forecastQty', 0)

                if qty < 0:
                    result.add_error("business", f"Record #{i}: forecastQty cannot be negative (got {qty}).")

                if sku and loc and w:
                    key = (sku, loc)
                    if key not in sku_loc_weeks:
                        sku_loc_weeks[key] = set()
                    sku_loc_weeks[key].add(w)

            for (sku, loc), actual_weeks in sku_loc_weeks.items():
                missing = expected_weeks - actual_weeks
                if missing:
                    result.add_error("business", f"Consensus Forecast horizon incomplete for SKU '{sku}' at location '{loc}'. Missing {len(missing)} weeks (e.g. {sorted(list(missing))[:3]}).")

        elif collection_name == 'supply_plan':
            for i, rec in enumerate(records):
                avail = rec.get('availableInventory', 0)
                prod = rec.get('plannedProduction', 0)
                pur = rec.get('plannedPurchase', 0)
                fc = rec.get('forecastQty', 0)
                proj = rec.get('projectedInventory', 0)

                if avail < 0 or prod < 0 or pur < 0 or fc < 0:
                    result.add_error("business", f"Record #{i}: Supply plan quantities (available, prod, purchase, forecast) cannot be negative.")

                # MRP Netting Inventory Conservation Equation
                calc_proj = avail + prod + pur - fc
                if proj != calc_proj:
                    result.add_error("business", f"Record #{i}: MRP inventory equation balance error. projected ({proj}) != available ({avail}) + prod ({prod}) + purchase ({pur}) - forecast ({fc}) = {calc_proj}.")

        return result

    # =========================================================================
    # CATEGORY 4: CROSS COLLECTION VALIDATION
    # =========================================================================
    def validate_cross_collection(self, collection_name: str, records: List[Dict[str, Any]], ref_manager: ReferenceManager) -> ValidationResult:
        """
        Validates cross-collection consistency between Inventory, Purchase Orders, Production Orders, and Supply Plan.
        """
        result = ValidationResult(collection_name)

        if collection_name == 'supply_plan':
            # 1. Supply Plan vs Inventory (Initial W01 availableInventory matches Inventory closing/available Qty)
            inv_docs = ref_manager.get_all_documents('inventory')
            inv_map: Dict[tuple, float] = {}
            for inv in inv_docs:
                key = (inv.get('skuCode'), inv.get('warehouseCode'))
                inv_map[key] = inv_map.get(key, 0) + inv.get('availableQty', 0)

            for rec in records:
                if rec.get('week') == '2026-W01':
                    sku = rec.get('skuCode')
                    wh = rec.get('warehouseCode')
                    key = (sku, wh)
                    if key in inv_map:
                        plan_avail = rec.get('availableInventory', 0)
                        actual_inv = inv_map[key]
                        if abs(plan_avail - actual_inv) > actual_inv * 0.5 and actual_inv > 0:
                            result.add_warning("cross_collection", f"Supply Plan W01 availableInventory ({plan_avail}) differs significantly from Inventory collection ({actual_inv}) for SKU '{sku}' at '{wh}'.")

            # 2. Supply Plan vs Consensus Forecast (forecastQty alignment)
            fc_docs = ref_manager.get_all_documents('consensus_forecast')
            fc_map: Dict[tuple, float] = {}
            for fc in fc_docs:
                key = (fc.get('skuCode'), fc.get('location'), fc.get('week'))
                fc_map[key] = fc_map.get(key, 0) + fc.get('forecastQty', 0)

            for rec in records:
                sku = rec.get('skuCode')
                wh = rec.get('warehouseCode')
                w = rec.get('week')
                key = (sku, wh, w)
                if key in fc_map:
                    sp_fc = rec.get('forecastQty', 0)
                    cf_fc = fc_map[key]
                    if sp_fc != cf_fc:
                        result.add_error("cross_collection", f"Forecast mismatch in week {w} for SKU '{sku}' at '{wh}': Supply Plan ({sp_fc}) != Consensus Forecast ({cf_fc}).")

        elif collection_name == 'purchase_orders':
            # Purchase Orders vs Supply Plan (total planned purchase vs PO ordered qty)
            sp_docs = ref_manager.get_all_documents('supply_plan')
            if sp_docs:
                sp_purchase_by_sku: Dict[str, float] = {}
                for sp in sp_docs:
                    sku = sp.get('skuCode')
                    if sku:
                        sp_purchase_by_sku[sku] = sp_purchase_by_sku.get(sku, 0) + sp.get('plannedPurchase', 0)

                po_by_sku: Dict[str, float] = {}
                for po in records:
                    sku = po.get('skuCode')
                    if sku:
                        po_by_sku[sku] = po_by_sku.get(sku, 0) + po.get('orderedQty', 0)

                for sku, planned_pur in sp_purchase_by_sku.items():
                    po_qty = po_by_sku.get(sku, 0)
                    if planned_pur > 0 and po_qty == 0:
                        result.add_warning("cross_collection", f"Supply Plan specifies planned purchase of {planned_pur} for SKU '{sku}', but no Purchase Orders were generated.")

        elif collection_name == 'production_orders':
            # Production Orders vs Supply Plan
            sp_docs = ref_manager.get_all_documents('supply_plan')
            if sp_docs:
                sp_prod_by_sku: Dict[str, float] = {}
                for sp in sp_docs:
                    sku = sp.get('skuCode')
                    if sku:
                        sp_prod_by_sku[sku] = sp_prod_by_sku.get(sku, 0) + sp.get('plannedProduction', 0)

                wo_by_sku: Dict[str, float] = {}
                for wo in records:
                    sku = wo.get('skuCode')
                    if sku:
                        wo_by_sku[sku] = wo_by_sku.get(sku, 0) + wo.get('plannedQty', 0)

                for sku, planned_prod in sp_prod_by_sku.items():
                    wo_qty = wo_by_sku.get(sku, 0)
                    if planned_prod > 0 and wo_qty == 0:
                        result.add_warning("cross_collection", f"Supply Plan specifies planned production of {planned_prod} for SKU '{sku}', but no Production Orders were generated.")

        return result

    # =========================================================================
    # CATEGORY 5: DATA QUALITY CHECKS
    # =========================================================================
    def validate_data_quality(self, collection_name: str, records: List[Dict[str, Any]], ref_manager: ReferenceManager) -> ValidationResult:
        result = ValidationResult(collection_name)

        if not records:
            return result

        # 1. Duplicate Records Detection
        pk_field = self._get_pk_field(collection_name)
        seen_pkeys: Set[str] = set()
        seen_compound: Set[tuple] = set()

        for i, rec in enumerate(records):
            # Single primary key duplicate check
            if pk_field in rec and rec[pk_field] is not None:
                pkey = str(rec[pk_field])
                if pkey in seen_pkeys:
                    result.add_error("data_quality", f"Duplicate primary key '{pkey}' detected in [{collection_name}] at record #{i}.")
                seen_pkeys.add(pkey)

            # Compound key duplicate check for time series
            if collection_name == 'consensus_forecast':
                ckey = (rec.get('skuCode'), rec.get('location'), rec.get('week'))
                if ckey in seen_compound:
                    result.add_error("data_quality", f"Duplicate forecast entry for SKU '{ckey[0]}', location '{ckey[1]}', week '{ckey[2]}'.")
                seen_compound.add(ckey)

            elif collection_name == 'supply_plan':
                ckey = (rec.get('skuCode'), rec.get('warehouseCode') or rec.get('plantCode'), rec.get('week'))
                if ckey in seen_compound:
                    result.add_error("data_quality", f"Duplicate supply plan entry for SKU '{ckey[0]}', location '{ckey[1]}', week '{ckey[2]}'.")
                seen_compound.add(ckey)

        # 2. Unrealistic Spikes Detection (Outlier detection)
        if collection_name == 'consensus_forecast':
            sku_qtys: Dict[str, List[float]] = {}
            for rec in records:
                sku = rec.get('skuCode')
                qty = rec.get('forecastQty', 0)
                if sku:
                    if sku not in sku_qtys:
                        sku_qtys[sku] = []
                    sku_qtys[sku].append(qty)

            for sku, qtys in sku_qtys.items():
                if len(qtys) > 5:
                    avg_q = sum(qtys) / len(qtys)
                    max_q = max(qtys)
                    # Alert if spike is > 5x average demand without extreme promo lift
                    if max_q > avg_q * 5 and avg_q > 0:
                        result.add_warning("data_quality", f"Unrealistic forecast spike detected for SKU '{sku}': max weekly forecast ({max_q}) is > 5x mean ({avg_q:.1f}).")

        # 3. Impossible Lead Times & Invalid Capacities
        if collection_name in ('supplier_master', 'supplier_product_mapping', 'product_planning'):
            for i, rec in enumerate(records):
                lt = rec.get('leadTimeDays', rec.get('defaultLeadTimeDays', 14))
                if lt <= 0 or lt > 365:
                    result.add_error("data_quality", f"Record #{i} in [{collection_name}]: Impossible lead time {lt} days (must be between 1 and 365).")

        if collection_name in ('plant_master', 'plant_product_mapping', 'warehouse_master'):
            for i, rec in enumerate(records):
                d_cap = rec.get('dailyCapacity', 1)
                w_cap = rec.get('weeklyCapacity', 1)
                if d_cap <= 0 or w_cap <= 0:
                    result.add_error("data_quality", f"Record #{i} in [{collection_name}]: Invalid zero or negative capacity (daily={d_cap}, weekly={w_cap}).")

        return result

    # =========================================================================
    # CATEGORY 6: LLM VALIDATION (NEVER STOPS GENERATION)
    # =========================================================================
    def validate_llm_service(self, llm_service: Optional[LLMEnrichmentService]) -> ValidationResult:
        """
        Validates LLM enrichment configuration, caching infrastructure, and offline API resilience.
        STRICT RULE: LLM failures must NEVER stop generation (is_valid remains True).
        """
        result = ValidationResult("llm_enrichment_service")

        if not llm_service:
            result.add_warning("llm", "LLM enrichment service instance is not provided. Skipping LLM validation.")
            return result

        if not llm_service.enabled:
            result.add_warning("llm", "LLM text narrative enrichment is disabled via configuration.")
            return result

        # 1. Ensure Cache Exists
        if not hasattr(llm_service, 'cache_manager') or llm_service.cache_manager is None:
            result.add_warning("llm", "LLM CacheManager instance missing. Text enrichment will run un-cached.")
        else:
            cache_dir = getattr(llm_service.cache_manager, 'cache_dir', None)
            if cache_dir and not cache_dir.exists():
                result.add_warning("llm", f"LLM Cache directory [{cache_dir}] does not exist yet. Will be auto-created.")

        # 2. API Key / Endpoint / Availability Check
        if not llm_service.api_key:
            result.add_warning("llm", "NVIDIA_API_KEY / API key missing. LLM enrichment will use deterministic fallback templates.")

        return result

    # Helper method for primary keys
    def _get_pk_field(self, collection_name: str) -> str:
        pk_map = {
            'product_master': 'skuCode',
            'product_planning': 'skuCode',
            'product_pricing': 'skuCode',
            'product_logistics': 'skuCode',
            'plant_master': 'plantCode',
            'warehouse_master': 'warehouseCode',
            'supplier_master': 'supplierCode',
            'customer_channel_master': 'channelCode',
            'production_orders': 'productionOrderNo',
            'purchase_orders': 'poNumber',
            'transfer_orders': 'transferOrderNo',
            'what_if_scenarios': 'scenarioName'
        }
        return pk_map.get(collection_name, '_id')
