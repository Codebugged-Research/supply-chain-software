from generators.base_generator import BaseGenerator
from datetime import datetime, timedelta


class ProductionOrderGenerator(BaseGenerator):
    """
    Generator for Domain 5 (Manufacturing - Production Orders):
    - production_orders
    Schedules factory work orders by plant, tracking planned vs produced quantities.
    """

    def __init__(self, **kwargs):
        super().__init__(domain_name="ProductionOrderDomain", **kwargs)

    def generate(self) -> dict[str, list[dict]]:
        plants = self.reference_manager.get_all_documents('plant_master')
        products = self.reference_manager.get_all_documents('product_master')

        records = []
        now_date = datetime(2026, 7, 28)
        now_str = now_date.isoformat() + "Z"

        wo_counter = 5000

        for plant in plants:
            plant_code = plant['plantCode']

            for prod in products:
                sku = prod['skuCode']

                for day_offset in [2, 10]:
                    wo_num = f"PO-202607-{wo_counter}"
                    wo_counter += 1

                    planned = 2000 if "AD141" in sku else 800
                    produced = planned if day_offset == 2 else 500
                    status = "COMPLETED" if day_offset == 2 else "IN_PROGRESS"

                    start_dt = now_date + timedelta(days=day_offset)
                    end_dt = start_dt + timedelta(days=3)

                    doc = {
                        "productionOrderNo": wo_num,
                        "skuCode": sku,
                        "plantCode": plant_code,
                        "plannedQty": planned,
                        "producedQty": produced,
                        "startDate": start_dt.strftime("%Y-%m-%dT06:00:00Z"),
                        "endDate": end_dt.strftime("%Y-%m-%dT18:00:00Z"),
                        "status": status,
                        "createdAt": now_str,
                        "updatedAt": now_str
                    }
                    records.append(doc)

        return {"production_orders": records}
