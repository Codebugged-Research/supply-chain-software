import json
from pathlib import Path


class ExportManager:
    """
    Storage & Export Adapter. Saves validated collection records into standard JSON files
    ready for MongoDB import (mongoimport) or direct database persistence.
    """

    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export_json(self, collection_name: str, records: list[dict]) -> str:
        """
        Exports collection records to output/{collection_name}.json
        """
        file_path = self.output_dir / f"{collection_name}.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(records, f, indent=2, ensure_ascii=False, default=str)
        return str(file_path)

    def export_to_mongodb(self, mongo_uri: str, db_name: str, collection_name: str, records: list[dict]) -> int:
        """
        Optional direct bulk upsert into MongoDB.
        """
        try:
            import pymongo
            client = pymongo.MongoClient(mongo_uri)
            db = client[db_name]
            coll = db[collection_name]
            if records:
                coll.delete_many({})  # Replace clean
                coll.insert_many(records)
                return len(records)
        except Exception:
            pass
        return 0
