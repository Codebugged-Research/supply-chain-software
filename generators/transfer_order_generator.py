from generators.base_generator import BaseGenerator
from datetime import datetime, timedelta


class TransferOrderGenerator(BaseGenerator):
    """
    Generator for Inter-DC Stock Transfers (Network Inventory Rebalancing):
    Simulates stock movements from Central Distribution Centers to Regional DCs.
    """

    def __init__(self, **kwargs):
        super().__init__(domain_name="TransferOrderDomain", **kwargs)

    def generate(self) -> dict[str, list[dict]]:
        warehouses = self.reference_manager.get_all_documents('warehouse_master')
        products = self.reference_manager.get_all_documents('product_master')

        records = []
        now_date = datetime(2026, 7, 28)
        now_str = now_date.isoformat() + "Z"

        central_dc = "WH-NORTH-DELHI"
        regional_dcs = [w['warehouseCode'] for w in warehouses if w['warehouseCode'] != central_dc]

        transfer_counter = 7000

        for r_dc in regional_dcs:
            for prod in products:
                sku = prod['skuCode']
                transfer_no = f"TRF-202607-{transfer_counter}"
                transfer_counter += 1

                qty = 1000 if "AD141" in sku else 300
                dispatch_dt = now_date + timedelta(days=2)
                eta_dt = dispatch_dt + timedelta(days=2)

                doc = {
                    "transferOrderNo": transfer_no,
                    "skuCode": sku,
                    "fromWarehouseCode": central_dc,
                    "toWarehouseCode": r_dc,
                    "transferQuantity": qty,
                    "dispatchDate": dispatch_dt.strftime("%Y-%m-%dT08:00:00Z"),
                    "expectedArrivalDate": eta_dt.strftime("%Y-%m-%dT18:00:00Z"),
                    "status": "IN_TRANSIT",
                    "createdAt": now_str,
                    "updatedAt": now_str
                }
                records.append(doc)

        return {"transfer_orders": records}
