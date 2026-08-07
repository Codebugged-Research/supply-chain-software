from generators.base_generator import BaseGenerator
from datetime import datetime


class PlantGenerator(BaseGenerator):
    """
    Generator for Domain 2, 3 & 5 (Plant Master, Line Qualifications, & BOM Master):
    - plant_master
    - plant_product_mapping
    - bom_master
    """

    def __init__(self, **kwargs):
        super().__init__(domain_name="PlantDomain", **kwargs)

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
        config_plants = self._extract_list('plants')
        config_products = self._extract_list('products')

        plant_records = []
        mapping_records = []
        bom_records = []
        now_str = datetime.utcnow().isoformat() + "Z"

        for p in config_plants:
            if not isinstance(p, dict):
                continue

            p_code = p.get('plantCode', 'PLANT-UNKNOWN')
            plant_doc = {
                "plantCode": p_code,
                "plantName": p.get('plantName', p_code),
                "country": p.get('country', 'IN'),
                "state": p.get('state', 'Uttar Pradesh'),
                "city": p.get('city', 'Noida'),
                "timezone": p.get('timezone', 'Asia/Kolkata'),
                "workingDays": int(p.get('workingDays', 6)),
                "workingShifts": int(p.get('workingShifts', 2)),
                "dailyCapacity": int(p.get('dailyCapacity', 25000)),
                "weeklyCapacity": int(p.get('weeklyCapacity', 150000)),
                "status": p.get('status', 'ACTIVE'),
                "createdAt": now_str,
                "updatedAt": now_str
            }
            plant_records.append(plant_doc)

            for idx, prod in enumerate(config_products):
                if not isinstance(prod, dict):
                    continue
                sku = prod.get('skuCode', f'SKU-{idx}')
                line_name = f"LINE-ASM-0{idx + 1}"
                mapping_doc = {
                    "plantCode": p_code,
                    "skuCode": sku,
                    "productionLine": line_name,
                    "dailyCapacity": 2000,
                    "weeklyCapacity": 12000,
                    "productionRate": 150.0,
                    "status": "QUALIFIED",
                    "createdAt": now_str,
                    "updatedAt": now_str
                }
                mapping_records.append(mapping_doc)

        # Generate realistic BOM structures for Finished Goods
        components = [
            ("SKU-COMP-CHIP", "SoC Bluetooth Audio Chip", "EA", 1.0, 1.5),
            ("SKU-COMP-BATT", "Lithium Polymer Battery 300mAh", "EA", 1.0, 2.0),
            ("SKU-COMP-CASE", "Injection Molded Plastic Housing", "EA", 1.0, 1.0)
        ]

        for prod in config_products:
            if not isinstance(prod, dict):
                continue
            parent_sku = prod.get('skuCode', 'SKU-FG-1001')
            for comp_code, comp_name, uom, qty, scrap in components:
                bom_doc = {
                    "parentSku": parent_sku,
                    "componentSku": comp_code,
                    "quantity": qty,
                    "unitOfMeasure": uom,
                    "scrapPercent": scrap,
                    "isOptional": False,
                    "effectiveFrom": "2026-01-01T00:00:00Z",
                    "effectiveTo": None,
                    "createdAt": now_str,
                    "updatedAt": now_str
                }
                bom_records.append(bom_doc)

        return {
            "plant_master": plant_records,
            "plant_product_mapping": mapping_records,
            "bom_master": bom_records
        }
