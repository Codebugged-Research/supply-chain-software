from generators.base_generator import BaseGenerator
from datetime import datetime


class WarehouseGenerator(BaseGenerator):
    """
    Generator for Domain 2 (Warehouse Master & Customer Channel Master):
    - warehouse_master
    - customer_channel_master
    """

    def __init__(self, **kwargs):
        super().__init__(domain_name="WarehouseDomain", **kwargs)

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
        config_wh = self._extract_list('warehouses')
        config_ch = self._extract_list('channels')

        wh_records = []
        ch_records = []
        now_str = datetime.utcnow().isoformat() + "Z"

        for wh in config_wh:
            if not isinstance(wh, dict):
                continue
            wh_code = wh.get('warehouseCode', 'WH-UNKNOWN')
            wh_doc = {
                "warehouseCode": wh_code,
                "warehouseName": wh.get('warehouseName', wh_code),
                "warehouseType": wh.get('warehouseType', 'REGIONAL_DC'),
                "country": wh.get('country', 'IN'),
                "state": wh.get('state', 'Haryana'),
                "city": wh.get('city', 'Faridabad'),
                "capacityUnits": int(wh.get('capacityUnits', 500000)),
                "storageCost": float(wh.get('storageCost', 0.45)),
                "status": wh.get('status', 'ACTIVE'),
                "createdAt": now_str,
                "updatedAt": now_str
            }
            wh_records.append(wh_doc)

        for ch in config_ch:
            if not isinstance(ch, dict):
                continue
            ch_code = ch.get('channelCode', 'CH-UNKNOWN')
            ch_doc = {
                "channelCode": ch_code,
                "channelName": ch.get('channelName', ch_code),
                "channelType": ch.get('channelType', 'GENERAL_TRADE'),
                "priority": int(ch.get('priority', 5)),
                "serviceLevel": float(ch.get('serviceLevel', 95.0)),
                "defaultInventoryDays": int(ch.get('defaultInventoryDays', 7)),
                "status": ch.get('status', 'ACTIVE'),
                "createdAt": now_str,
                "updatedAt": now_str
            }
            ch_records.append(ch_doc)

        return {
            "warehouse_master": wh_records,
            "customer_channel_master": ch_records
        }
