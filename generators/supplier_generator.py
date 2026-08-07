from generators.base_generator import BaseGenerator
from datetime import datetime


class SupplierGenerator(BaseGenerator):
    """
    Generator for Domain 2 & 3 (Supplier Master & Sourcing Matrix):
    - supplier_master
    - supplier_product_mapping
    """

    def __init__(self, **kwargs):
        super().__init__(domain_name="SupplierDomain", **kwargs)

    def _extract_list(self, config_key: str) -> list[dict]:
        data = self.configs.get(config_key, {})
        if isinstance(data, dict):
            items = data.get(config_key, [])
            if isinstance(items, list) and items:
                return items
            return [data]
        elif isinstance(data, list):
            return data
        return []

    def generate(self) -> dict[str, list[dict]]:
        config_suppliers = self._extract_list('suppliers')
        config_products = self._extract_list('products')

        supplier_records = []
        mapping_records = []
        now_str = datetime.utcnow().isoformat() + "Z"

        for sup in config_suppliers:
            if not isinstance(sup, dict):
                continue

            sup_code = sup.get('supplierCode', 'SUP-UNKNOWN')
            profile_text = self.llm_service.enrich_supplier_profile(
                supplier_name=sup.get('supplierName', sup_code),
                city=sup.get('city', 'Noida'),
                rating=float(sup.get('rating', 4.5))
            )

            sup_doc = {
                "supplierCode": sup_code,
                "supplierName": sup.get('supplierName', sup_code),
                "country": sup.get('country', 'IN'),
                "city": sup.get('city', 'Noida'),
                "contactPerson": sup.get('contactPerson'),
                "rating": float(sup.get('rating', 4.5)),
                "qualityScore": float(sup.get('qualityScore', 98.0)),
                "onTimeDelivery": float(sup.get('onTimeDelivery', 95.0)),
                "defaultLeadTimeDays": int(sup.get('defaultLeadTimeDays', 14)),
                "status": sup.get('status', 'APPROVED'),
                "profile": profile_text,
                "createdAt": now_str,
                "updatedAt": now_str
            }
            supplier_records.append(sup_doc)

            # Generate supplier_product_mapping for active SKUs
            for idx, prod in enumerate(config_products):
                if not isinstance(prod, dict):
                    continue
                sku = prod.get('skuCode', f'SKU-{idx}')
                is_preferred = (idx == 0 and "DIXON" in sup_code) or (idx == 1 and "FOXCONN" in sup_code) or (idx == 2 and "SYRMA" in sup_code)

                map_doc = {
                    "supplierCode": sup_code,
                    "skuCode": sku,
                    "supplierSku": f"{sup_code}-{sku}",
                    "leadTimeDays": int(sup.get('defaultLeadTimeDays', 14)),
                    "minimumOrderQuantity": 500,
                    "orderMultiple": 100,
                    "purchasePrice": float(prod.get('pricing', {}).get('manufacturingCost', prod.get('manufacturingCost', 350.0))),
                    "preferredSupplier": is_preferred,
                    "maximumSupplyCapacity": 150000,
                    "status": "ACTIVE",
                    "createdAt": now_str,
                    "updatedAt": now_str
                }
                mapping_records.append(map_doc)

        return {
            "supplier_master": supplier_records,
            "supplier_product_mapping": mapping_records
        }
