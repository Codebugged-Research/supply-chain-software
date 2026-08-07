from generators.base_generator import BaseGenerator
from datetime import datetime


class SupplyPlanGenerator(BaseGenerator):
    """
    Generator for Domain 8 (Supply Planning Outputs):
    - supply_plan
    - supply_constraints
    - what_if_scenarios

    Executes dynamic MRP netting calculation over 52 weekly horizon buckets:
    projectedInventory = availableInventory + plannedProduction + plannedPurchase - forecastQty
    Logs supply constraints when shortages or capacity bottlenecks occur.
    """

    def __init__(self, **kwargs):
        super().__init__(domain_name="SupplyPlanDomain", **kwargs)

    def generate(self) -> dict[str, list[dict]]:
        products = self.reference_manager.get_all_documents('product_master')
        warehouses = self.reference_manager.get_all_documents('warehouse_master')
        forecasts = self.reference_manager.get_all_documents('consensus_forecast')

        plan_records = []
        constraint_records = []
        scenario_records = []

        now_str = datetime.utcnow().isoformat() + "Z"
        batch_id = "PLAN-BATCH-20260728-99"

        # Map forecasts: (skuCode, location, week) -> forecastQty
        forecast_map = {}
        for fc in forecasts:
            key = (fc['skuCode'], fc['location'], fc['week'])
            forecast_map[key] = forecast_map.get(key, 0) + fc['forecastQty']

        # Execute 52-week MRP time-phased calculation
        for prod in products:
            sku = prod['skuCode']
            safety_stock_target = 500 if "AD141" in sku else 200

            for wh in warehouses:
                wh_code = wh['warehouseCode']
                current_stock = 2500 if "AD141" in sku else 1000  # Initial opening balance

                for week_idx in range(1, 53):
                    week_str = f"2026-W{week_idx:02d}"
                    net_fc = forecast_map.get((sku, wh_code, week_str), 800)

                    avail_stock = current_stock
                    planned_prod = 0
                    planned_pur = 0

                    # Standard replenishment logic
                    if avail_stock - net_fc < safety_stock_target:
                        needed = (safety_stock_target + net_fc) - avail_stock
                        planned_pur = max(500, (needed // 100 + 1) * 100)  # Round up to MOQ multiple

                    proj_stock = avail_stock + planned_prod + planned_pur - net_fc
                    current_stock = max(0, proj_stock)  # Carry forward ending balance

                    supply_gap = 0
                    planning_status = "FEASIBLE"

                    # Log constraint during festive peak weeks (e.g. W41 Big Billion Days)
                    if week_idx == 41 and "AD141" in sku and wh_code == "WH-NORTH-DELHI":
                        supply_gap = 1200
                        planning_status = "SHORTAGE"
                        rec_action = self.llm_service.enrich_constraint_recommendation(
                            constraint_type="CAPACITY",
                            constraint_source=wh_code,
                            severity="HIGH"
                        )
                        c_doc = {
                            "skuCode": sku,
                            "constraintType": "CAPACITY",
                            "constraintSource": f"{wh_code} / {week_str}",
                            "severity": "HIGH",
                            "description": f"Festive demand surge capacity bottleneck of {supply_gap} units in week {week_str} at {wh_code}",
                            "recommendedAction": rec_action,
                            "resolved": False,
                            "createdAt": now_str,
                            "updatedAt": now_str
                        }
                        constraint_records.append(c_doc)

                    doc = {
                        "skuCode": sku,
                        "week": week_str,
                        "plantCode": None,
                        "warehouseCode": wh_code,
                        "forecastQty": net_fc,
                        "availableInventory": avail_stock,
                        "plannedProduction": planned_prod,
                        "plannedPurchase": planned_pur,
                        "projectedInventory": proj_stock,
                        "supplyGap": supply_gap,
                        "serviceLevel": 100.0 if supply_gap == 0 else max(70.0, float(100 - (supply_gap / net_fc * 100))),
                        "planningStatus": planning_status,
                        "generatedAt": now_str,
                        "createdAt": now_str,
                        "updatedAt": now_str
                    }
                    plan_records.append(doc)

        # Generate What-If Scenario Header
        sc_doc = {
            "scenarioName": "Q3 Festive Peak Demand Surge +20%",
            "description": "Simulating 20% festive surge across boAt TWS and Wearables portfolio",
            "createdBy": "planner.noida@boat-lifestyle.com",
            "assumptionType": "DEMAND_SURGE",
            "assumptionValue": 20.0,
            "generatedSupplyPlanId": batch_id,
            "createdAt": now_str,
            "updatedAt": now_str
        }
        scenario_records.append(sc_doc)

        return {
            "supply_plan": plan_records,
            "supply_constraints": constraint_records,
            "what_if_scenarios": scenario_records
        }
