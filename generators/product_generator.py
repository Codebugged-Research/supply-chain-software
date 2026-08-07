from generators.base_generator import BaseGenerator
from datetime import datetime


class ProductGenerator(BaseGenerator):
    """
    Generator for Domain 1 (Product Master & Sub-Collections):
    - product_master
    - product_planning
    - product_pricing
    - product_logistics

    Generates Finished Goods (boAt Airdopes 141, boAt Lunar Discovery, boAt Stone 350)
    and Raw Material Component SKUs for BOM assembly linkages.
    """

    def __init__(self, **kwargs):
        super().__init__(domain_name="ProductDomain", **kwargs)

    def generate(self) -> dict[str, list[dict]]:
        raw_products = self.configs.get('products', {}).get('products', [])
        if not isinstance(raw_products, list):
            raw_products = []

        master_records = []
        planning_records = []
        pricing_records = []
        logistics_records = []

        now_str = datetime.utcnow().isoformat() + "Z"

        # 1. Finished Goods (FG)
        for item in raw_products:
            if not isinstance(item, dict):
                continue

            sku = item.get('skuCode', 'SKU-UNKNOWN')

            # Optional LLM description enrichment
            enriched_desc = self.llm_service.enrich_product_description(
                sku_name=item.get('skuName', sku),
                brand=item.get('brand', 'boAt'),
                category=item.get('category', 'Audio'),
                variant=item.get('variant', 'Standard')
            )

            master_doc = {
                "skuCode": sku,
                "skuName": item.get('skuName', sku),
                "shortName": item.get('shortName'),
                "brand": item.get('brand', 'boAt'),
                "category": item.get('category', 'Audio'),
                "subCategory": item.get('subCategory', 'TWS Earbuds'),
                "productFamily": item.get('productFamily'),
                "productSeries": item.get('productSeries'),
                "modelNumber": item.get('modelNumber'),
                "color": item.get('color'),
                "variant": item.get('variant'),
                "technologyGeneration": item.get('technologyGeneration', 'Bluetooth 5.3'),
                "replacementSku": None,
                "barcode": str(item.get('barcode', '8904354201011')),
                "hsnCode": str(item.get('hsnCode', '85183000')),
                "unitOfMeasure": item.get('unitOfMeasure', 'EA'),
                "lifecycleStage": item.get('lifecycleStage', 'GROWTH'),
                "launchDate": "2025-01-15T00:00:00Z",
                "plannedEOLDate": "2028-12-31T00:00:00Z",
                "warrantyMonths": 12,
                "status": item.get('status', 'ACTIVE'),
                "description": enriched_desc,
                "createdAt": now_str,
                "updatedAt": now_str
            }
            master_records.append(master_doc)

            pl = item.get('planning', {})
            planning_doc = {
                "skuCode": sku,
                "abcClass": pl.get('abcClass', item.get('abcClass', 'A')),
                "xyzClass": pl.get('xyzClass', item.get('xyzClass', 'X')),
                "planningStrategy": pl.get('planningStrategy', item.get('planningStrategy', 'MTS')),
                "planningPriority": int(pl.get('planningPriority', item.get('planningPriority', 1))),
                "planningFenceDays": int(pl.get('planningFenceDays', item.get('planningFenceDays', 14))),
                "demandTimeFenceDays": int(pl.get('demandTimeFenceDays', item.get('demandTimeFenceDays', 7))),
                "safetyStockDays": float(pl.get('safetyStockDays', item.get('safetyStockDays', 15.0))),
                "reorderPointUnits": int(pl.get('reorderPointUnits', item.get('reorderPointUnits', 5000))),
                "reorderQuantity": int(pl.get('reorderQuantity', item.get('reorderQuantity', 10000))),
                "minimumOrderQuantity": int(pl.get('minimumOrderQuantity', item.get('minimumOrderQuantity', 2500))),
                "maximumInventoryUnits": pl.get('maximumInventoryUnits', item.get('maximumInventoryUnits')),
                "targetServiceLevel": float(pl.get('targetServiceLevel', item.get('targetServiceLevel', 98.5))),
                "forecastConsumptionMethod": pl.get('forecastConsumptionMethod', item.get('forecastConsumptionMethod', 'BOTH')),
                "plannerName": "Rajesh Kumar",
                "plannerGroup": pl.get('plannerGroup', item.get('plannerGroup', 'PLN-GRP-AUDIO')),
                "planningCalendar": pl.get('planningCalendar', item.get('planningCalendar', '6_DAY')),
                "createdAt": now_str,
                "updatedAt": now_str
            }
            planning_records.append(planning_doc)

            pr = item.get('pricing', {})
            pricing_doc = {
                "skuCode": sku,
                "standardCost": float(pr.get('standardCost', item.get('standardCost', 420.0))),
                "manufacturingCost": float(pr.get('manufacturingCost', item.get('manufacturingCost', 350.0))),
                "landedCost": float(pr.get('landedCost', item.get('landedCost', 480.0))),
                "transferPrice": None,
                "mrp": float(pr.get('mrp', item.get('mrp', 4490.0))),
                "averageSellingPrice": float(pr.get('averageSellingPrice', item.get('averageSellingPrice', 1299.0))),
                "targetMarginPercent": float(pr.get('targetMarginPercent', item.get('targetMarginPercent', 63.0))),
                "currency": pr.get('currency', item.get('currency', 'INR')),
                "effectiveFrom": "2026-01-01T00:00:00Z",
                "createdAt": now_str,
                "updatedAt": now_str
            }
            pricing_records.append(pricing_doc)

            lg = item.get('logistics', {})
            logistics_doc = {
                "skuCode": sku,
                "netWeightKg": float(lg.get('netWeightKg', item.get('netWeightKg', 0.06))),
                "grossWeightKg": float(lg.get('grossWeightKg', item.get('grossWeightKg', 0.18))),
                "productLengthCm": float(lg.get('productLengthCm', item.get('productLengthCm', 6.5))),
                "productWidthCm": float(lg.get('productWidthCm', item.get('productWidthCm', 5.0))),
                "productHeightCm": float(lg.get('productHeightCm', item.get('productHeightCm', 2.8))),
                "productVolume": float(lg.get('productVolume', item.get('productVolume', 0.000091))),
                "cartonQuantity": int(lg.get('cartonQuantity', item.get('cartonQuantity', 40))),
                "cartonLength": float(lg.get('cartonLength', item.get('cartonLength', 35.0))),
                "cartonWidth": float(lg.get('cartonWidth', item.get('cartonWidth', 28.0))),
                "cartonHeight": float(lg.get('cartonHeight', item.get('cartonHeight', 22.0))),
                "cartonWeight": float(lg.get('cartonWeight', item.get('cartonWeight', 7.8))),
                "palletQuantity": int(lg.get('palletQuantity', item.get('palletQuantity', 1920))),
                "stackLimit": int(lg.get('stackLimit', item.get('stackLimit', 5))),
                "fragile": bool(lg.get('fragile', item.get('fragile', False))),
                "hazardousMaterial": bool(lg.get('hazardousMaterial', item.get('hazardousMaterial', True))),
                "storageCondition": lg.get('storageCondition', item.get('storageCondition', 'AMBIENT')),
                "createdAt": now_str,
                "updatedAt": now_str
            }
            logistics_records.append(logistics_doc)

        # 2. Raw Material Components (RM) for BOM assembly linkage
        components = [
            ("SKU-COMP-CHIP", "SoC Bluetooth Audio Chip", "Electronic Components", "Microchips", 85423100),
            ("SKU-COMP-BATT", "Lithium Polymer Battery 300mAh", "Energy Storage", "Batteries", 85076000),
            ("SKU-COMP-CASE", "Injection Molded Plastic Housing", "Materials", "Enclosures", 39269099)
        ]

        for comp_sku, comp_name, cat, subcat, hsn in components:
            comp_master = {
                "skuCode": comp_sku,
                "skuName": comp_name,
                "shortName": comp_name[:15],
                "brand": "boAt-Components",
                "category": cat,
                "subCategory": subcat,
                "productFamily": "Component Series",
                "productSeries": "Gen1",
                "modelNumber": comp_sku,
                "color": "Standard",
                "variant": "Industrial",
                "technologyGeneration": "GEN3",
                "replacementSku": None,
                "barcode": None,
                "hsnCode": str(hsn),
                "unitOfMeasure": "EA",
                "lifecycleStage": "MATURE",
                "launchDate": "2025-01-15T00:00:00Z",
                "plannedEOLDate": "2028-12-31T00:00:00Z",
                "warrantyMonths": 12,
                "status": "ACTIVE",
                "description": f"Component raw material {comp_name} for boAt assembly.",
                "createdAt": now_str,
                "updatedAt": now_str
            }
            master_records.append(comp_master)

            comp_planning = {
                "skuCode": comp_sku,
                "abcClass": "A",
                "xyzClass": "X",
                "planningStrategy": "MTS",
                "planningPriority": 1,
                "planningFenceDays": 14,
                "demandTimeFenceDays": 7,
                "safetyStockDays": 20.0,
                "reorderPointUnits": 10000,
                "reorderQuantity": 20000,
                "minimumOrderQuantity": 5000,
                "maximumInventoryUnits": 100000,
                "targetServiceLevel": 99.0,
                "forecastConsumptionMethod": "BOTH",
                "plannerName": "Rajesh Kumar",
                "plannerGroup": "PLN-GRP-COMP",
                "planningCalendar": "6_DAY",
                "createdAt": now_str,
                "updatedAt": now_str
            }
            planning_records.append(comp_planning)

            comp_pricing = {
                "skuCode": comp_sku,
                "standardCost": 50.0,
                "manufacturingCost": 45.0,
                "landedCost": 55.0,
                "transferPrice": None,
                "mrp": 100.0,
                "averageSellingPrice": 60.0,
                "targetMarginPercent": 25.0,
                "currency": "INR",
                "effectiveFrom": "2026-01-01T00:00:00Z",
                "createdAt": now_str,
                "updatedAt": now_str
            }
            pricing_records.append(comp_pricing)

            comp_logistics = {
                "skuCode": comp_sku,
                "netWeightKg": 0.01,
                "grossWeightKg": 0.02,
                "productLengthCm": 2.0,
                "productWidthCm": 2.0,
                "productHeightCm": 1.0,
                "productVolume": 0.000004,
                "cartonQuantity": 500,
                "cartonLength": 20.0,
                "cartonWidth": 20.0,
                "cartonHeight": 10.0,
                "cartonWeight": 5.0,
                "palletQuantity": 10000,
                "stackLimit": 10,
                "fragile": False,
                "hazardousMaterial": False,
                "storageCondition": "AMBIENT",
                "createdAt": now_str,
                "updatedAt": now_str
            }
            logistics_records.append(comp_logistics)

        return {
            "product_master": master_records,
            "product_planning": planning_records,
            "product_pricing": pricing_records,
            "product_logistics": logistics_records
        }
