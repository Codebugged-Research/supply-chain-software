import sys
import argparse
from datetime import datetime

from generators.seed_manager import SeedManager
from generators.config_loader import ConfigLoader
from generators.reference_manager import ReferenceManager
from generators.validation_engine import ValidationEngine
from generators.export_manager import ExportManager
from generators.llm_enrichment_service import LLMEnrichmentService
from generators.logger import Logger

from generators.product_generator import ProductGenerator
from generators.supplier_generator import SupplierGenerator
from generators.plant_generator import PlantGenerator
from generators.warehouse_generator import WarehouseGenerator
from generators.inventory_generator import InventoryGenerator
from generators.forecast_generator import ForecastGenerator
from generators.purchase_order_generator import PurchaseOrderGenerator
from generators.production_order_generator import ProductionOrderGenerator
from generators.transfer_order_generator import TransferOrderGenerator
from generators.supply_plan_generator import SupplyPlanGenerator
from generators.seed_db import seed_database


def main():
    parser = argparse.ArgumentParser(description="Supply Planning Synthetic Data Generator Framework")
    parser.add_argument("--seed", type=int, default=42, help="Master random seed for deterministic generation")
    parser.add_argument("--config-dir", type=str, default="config", help="Directory containing YAML configs")
    parser.add_argument("--output-dir", type=str, default="output", help="Output directory for generated JSON files")
    parser.add_argument("--llm-enrich", action="store_true", help="Enable optional LLM text narrative enrichment")
    parser.add_argument("--mongo-uri", type=str, default=None, help="MongoDB Connection URI to seed database directly")
    parser.add_argument("--db-name", type=str, default="supply_chain_db", help="Target MongoDB Database Name")
    args = parser.parse_args()

    logger = Logger("SupplyChainGenerator")
    logger.info("Initializing Synthetic Data Generation Framework", seed=args.seed)

    # Core Services
    seed_mgr = SeedManager(master_seed=args.seed)
    config_loader = ConfigLoader(config_dir=args.config_dir)
    ref_mgr = ReferenceManager()
    val_engine = ValidationEngine()
    export_mgr = ExportManager(output_dir=args.output_dir)
    llm_service = LLMEnrichmentService(enabled=args.llm_enrich, master_seed=args.seed)

    generator_kwargs = {
        'seed_manager': seed_mgr,
        'config_loader': config_loader,
        'reference_manager': ref_mgr,
        'validation_engine': val_engine,
        'export_manager': export_mgr,
        'llm_service': llm_service,
        'logger': logger
    }

    # Pipeline Execution in Topological Dependency Order
    pipeline = [
        ("Product Generator", ProductGenerator(**generator_kwargs)),
        ("Supplier Generator", SupplierGenerator(**generator_kwargs)),
        ("Plant Generator", PlantGenerator(**generator_kwargs)),
        ("Warehouse Generator", WarehouseGenerator(**generator_kwargs)),
        ("Inventory Generator", InventoryGenerator(**generator_kwargs)),
        ("Forecast Generator", ForecastGenerator(**generator_kwargs)),
        ("Supply Plan Generator", SupplyPlanGenerator(**generator_kwargs)),
        ("Purchase Order Generator", PurchaseOrderGenerator(**generator_kwargs)),
        ("Production Order Generator", ProductionOrderGenerator(**generator_kwargs)),
        ("Transfer Order Generator", TransferOrderGenerator(**generator_kwargs)),
    ]

    total_records = 0
    all_summary = {}

    for name, gen in pipeline:
        result = gen.run()
        for coll, recs in result.items():
            count = len(recs)
            total_records += count
            all_summary[coll] = count

    logger.info("SYNTHETIC DATA GENERATION COMPLETED SUCCESSFULLY", total_records=total_records)
    print("\n=======================================================")
    print(" GENERATED COLLECTIONS SUMMARY & JSON OUTPUT FILES")
    print("=======================================================")
    for coll, count in all_summary.items():
        print(f"  - {coll:<30}: {count:>6} records  -> output/{coll}.json")
    print("=======================================================\n")

    if args.mongo_uri:
        seed_database(args.mongo_uri, args.db_name, args.output_dir)


if __name__ == "__main__":
    main()
