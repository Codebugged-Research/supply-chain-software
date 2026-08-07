from generators.base_generator import BaseGenerator
from datetime import datetime, timedelta


class PurchaseOrderGenerator(BaseGenerator):
    """
    Generator for Domain 6 (Procurement - Purchase Orders):
    - purchase_orders
    Converts planned vendor requirements into open purchase orders respecting MOQs and lead times.
    """

    def __init__(self, **kwargs):
        super().__init__(domain_name="PurchaseOrderDomain", **kwargs)

    def generate(self) -> dict[str, list[dict]]:
        suppliers = self.reference_manager.get_all_documents('supplier_master')
        products = self.reference_manager.get_all_documents('product_master')

        records = []
        now_date = datetime(2026, 7, 28)
        now_str = now_date.isoformat() + "Z"

        po_counter = 1000

        for sup in suppliers:
            sup_code = sup['supplierCode']
            lead_days = sup.get('defaultLeadTimeDays', 14)

            for prod in products:
                sku = prod['skuCode']

                # Generate 2 realistic purchase orders per vendor-SKU pair
                for offset_days in [7, 14]:
                    po_num = f"PUR-202607-{po_counter}"
                    po_counter += 1

                    ordered = 2500 if "AD141" in sku else 1000
                    received = ordered if offset_days == 7 else 0
                    status = "CLOSED" if received == ordered else "CONFIRMED"

                    exp_date = (now_date + timedelta(days=offset_days + lead_days)).strftime("%Y-%m-%d")

                    doc = {
                        "poNumber": po_num,
                        "supplierCode": sup_code,
                        "skuCode": sku,
                        "orderedQty": ordered,
                        "receivedQty": received,
                        "expectedDeliveryDate": f"{exp_date}T00:00:00Z",
                        "status": status,
                        "createdAt": now_str,
                        "updatedAt": now_str
                    }
                    records.append(doc)

        return {"purchase_orders": records}
