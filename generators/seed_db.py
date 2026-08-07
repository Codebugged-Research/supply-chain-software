import argparse
import json
from pathlib import Path


def seed_database(mongo_uri: str, db_name: str = "supply_chain_db", output_dir: str = "output"):
    output_path = Path(output_dir)
    json_files = list(output_path.glob("*.json"))

    if not json_files:
        print(f"No JSON files found in '{output_dir}'. Please run 'python -m generators.cli' first.")
        return

    try:
        import pymongo
        print(f"Connecting to MongoDB at: {mongo_uri}...")
        client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        db = client[db_name]

        # Test connection
        client.server_info()
        print(f"Connected successfully to database '{db_name}'.")

        total_inserted = 0
        for jf in json_files:
            coll_name = jf.stem
            with open(jf, 'r', encoding='utf-8') as f:
                records = json.load(f)

            if records:
                coll = db[coll_name]
                coll.delete_many({})  # Clean refresh
                coll.insert_many(records)
                print(f"  [+] Seeded collection '{coll_name:<25}': {len(records):>5} documents")
                total_inserted += len(records)

        print(f"\n[SUCCESS] Successfully seeded {total_inserted} documents into MongoDB database '{db_name}'.")

    except Exception as e:
        print(f"\n[INFO] MongoDB is not currently running locally or accessible at '{mongo_uri}'.")
        print(f"Error details: {e}")
        print(f"\nAll generated datasets are safely stored in JSON format under '{output_dir}/':")
        for jf in json_files:
            print(f"  - {jf.name}")
        print("\nTo import into MongoDB when ready, start your MongoDB instance and run:")
        print(f"  python -m generators.seed_db --mongo-uri <YOUR_MONGODB_URI>")


def main():
    parser = argparse.ArgumentParser(description="Seed MongoDB with generated synthetic datasets")
    parser.add_argument("--mongo-uri", type=str, default="mongodb://localhost:27017", help="MongoDB Connection URI")
    parser.add_argument("--db-name", type=str, default="supply_chain_db", help="Target MongoDB Database Name")
    parser.add_argument("--output-dir", type=str, default="output", help="Directory containing JSON files")
    args = parser.parse_args()

    seed_database(args.mongo_uri, args.db_name, args.output_dir)


if __name__ == "__main__":
    main()
