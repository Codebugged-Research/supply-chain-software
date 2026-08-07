from generators.base_generator import BaseGenerator
from datetime import datetime


class ForecastGenerator(BaseGenerator):
    """
    Generator for Domain 7 (Demand Planning - Consensus Forecast):
    - consensus_forecast
    Generates time-series weekly gross demand incorporating seasonality, promotional lifts, and festival peaks.
    """

    def __init__(self, **kwargs):
        super().__init__(domain_name="ForecastDomain", **kwargs)

    def generate(self) -> dict[str, list[dict]]:
        products = self.reference_manager.get_all_documents('product_master')
        warehouses = self.reference_manager.get_all_documents('warehouse_master')
        promotions = self.configs.get('promotion_calendar', {}).get('events', [])

        records = []
        now_str = datetime.utcnow().isoformat() + "Z"

        # Baseline demand per product
        base_demand_map = {
            "SKU-BOAT-AD141": 1500,  # High volume TWS
            "SKU-BOAT-LD100": 800,   # Smartwatch NPI
            "SKU-BOAT-ST350": 600    # Portable Speaker
        }

        # 52 Horizon Weeks (2026-W01 to 2026-W52)
        for week_idx in range(1, 53):
            week_str = f"2026-W{week_idx:02d}"

            # Quarterly seasonality weight
            if week_idx <= 13:
                seasonality = 0.85  # Q1 Dip
            elif week_idx <= 26:
                seasonality = 0.95  # Q2 Summer / IPL
            elif week_idx <= 39:
                seasonality = 1.10  # Q3 Pre-festive
            else:
                seasonality = 1.45  # Q4 Festive Surge

            # Promotional Lift Multiplier
            promo_lift = 1.0
            if week_idx in (4, 15, 32, 41, 44):  # Festive promo weeks
                if week_idx == 41:  # Big Billion Days / GIF
                    promo_lift = 4.8
                elif week_idx == 44:  # Diwali Peak
                    promo_lift = 3.5
                elif week_idx == 32:  # Independence Sale
                    promo_lift = 2.5
                else:
                    promo_lift = 1.8

            for prod in products:
                sku = prod['skuCode']
                base_qty = base_demand_map.get(sku, 1000)

                for wh in warehouses:
                    location = wh['warehouseCode']
                    
                    # Compute weekly forecast quantity
                    final_qty = int(base_qty * seasonality * promo_lift * (0.95 + (self.rng.random() * 0.1)))

                    doc = {
                        "skuCode": sku,
                        "location": location,
                        "week": week_str,
                        "forecastQty": max(100, final_qty),
                        "forecastVersion": "v1.0",
                        "approvedBy": "vp.supplychain@boat-lifestyle.com",
                        "approvedDate": "2026-01-01T00:00:00Z",
                        "createdAt": now_str,
                        "updatedAt": now_str
                    }
                    records.append(doc)

        return {"consensus_forecast": records}
