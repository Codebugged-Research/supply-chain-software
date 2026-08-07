from generators.base_generator import BaseGenerator
from datetime import datetime


class InventoryGenerator(BaseGenerator):
    """
    Generator for Domain 4 (Inventory):
    - inventory
    Calculates initial stock balances, FEFO batch allocations, and stock status splits.
    """

    def __init__(self, **kwargs):
        super().__init__(domain_name="InventoryDomain", **kwargs)

    def generate(self) -> dict[str, list[dict]]:
        products = self.reference_manager.get_all_documents('product_master')
        warehouses = self.reference_manager.get_all_documents('warehouse_master')
        plants = self.reference_manager.get_all_documents('plant_master')

        records = []
        now_str = datetime.utcnow().isoformat() + "Z"

        # Generate stock balances at Distribution Centers
        for prod in products:
            sku = prod['skuCode']
            for wh in warehouses:
                wh_code = wh['warehouseCode']
                batch_no = f"BAT-202607-{wh_code[-2:]}"

                avail = self.rng.randint(2000, 8000)
                res = self.rng.randint(100, 500)
                blk = self.rng.randint(0, 50)
                qa = self.rng.randint(0, 100)
                opening = avail + res + blk + qa
                closing = avail + res + blk + qa

                doc = {
                    "skuCode": sku,
                    "warehouseCode": wh_code,
                    "plantCode": None,
                    "batchNumber": batch_no,
                    "availableQty": avail,
                    "reservedQty": res,
                    "blockedQty": blk,
                    "inTransitQty": self.rng.randint(200, 1000),
                    "qualityInspectionQty": qa,
                    "openingQty": opening,
                    "closingQty": closing,
                    "lastUpdated": now_str,
                    "createdAt": now_str,
                    "updatedAt": now_str
                }
                records.append(doc)

        # Generate stock balances at Factory Plants
        for prod in products:
            sku = prod['skuCode']
            for plant in plants:
                plant_code = plant['plantCode']
                batch_no = f"BAT-202607-P{plant_code[-2:]}"

                avail = self.rng.randint(1500, 5000)
                res = self.rng.randint(50, 300)
                blk = 0
                qa = self.rng.randint(50, 200)
                opening = avail + res + blk + qa
                closing = avail + res + blk + qa

                doc = {
                    "skuCode": sku,
                    "warehouseCode": None,
                    "plantCode": plant_code,
                    "batchNumber": batch_no,
                    "availableQty": avail,
                    "reservedQty": res,
                    "blockedQty": blk,
                    "inTransitQty": 0,
                    "qualityInspectionQty": qa,
                    "openingQty": opening,
                    "closingQty": closing,
                    "lastUpdated": now_str,
                    "createdAt": now_str,
                    "updatedAt": now_str
                }
                records.append(doc)

        return {"inventory": records}
