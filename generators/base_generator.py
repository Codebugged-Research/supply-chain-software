from abc import ABC, abstractmethod
from generators.seed_manager import SeedManager
from generators.config_loader import ConfigLoader
from generators.reference_manager import ReferenceManager
from generators.validation_engine import ValidationEngine
from generators.export_manager import ExportManager
from generators.llm_enrichment_service import LLMEnrichmentService
from generators.logger import Logger


class BaseGenerator(ABC):
    """
    Abstract Base Class for all synthetic data generators.
    Integrates seed derivation, PRNG random utilities, state management,
    validation quality gates, LLM narrative enrichment, and export adapters.
    """

    def __init__(
        self,
        domain_name: str,
        seed_manager: SeedManager,
        config_loader: ConfigLoader,
        reference_manager: ReferenceManager,
        validation_engine: ValidationEngine,
        export_manager: ExportManager,
        llm_service: LLMEnrichmentService,
        logger: Logger
    ):
        self.domain_name = domain_name
        self.seed_manager = seed_manager
        self.config_loader = config_loader
        self.reference_manager = reference_manager
        self.validation_engine = validation_engine
        self.export_manager = export_manager
        self.llm_service = llm_service
        self.logger = logger

        # Isolated domain random generator
        self.rng = self.seed_manager.get_random_instance(domain_name)
        self.configs = self.config_loader.load_all()

    @abstractmethod
    def generate(self) -> dict[str, list[dict]]:
        """
        Core generation method to be implemented by child domain generators.
        Returns a dictionary mapping collection_name -> list of generated documents.
        """
        pass

    def run(self) -> dict[str, list[dict]]:
        """
        Executes generation, runs 3-layer validation, registers entity references,
        applies optional LLM enrichment, and exports JSON files.
        """
        self.logger.info(f"Starting generation for domain: [{self.domain_name}]")
        collection_data = self.generate()

        for coll_name, records in collection_data.items():
            # 1. Register into StateStore / ReferenceManager
            key_field = self._get_primary_key_field(coll_name)
            for rec in records:
                pkey = rec.get(key_field, rec.get('_id', rec.get('skuCode', rec.get('plantCode', rec.get('warehouseCode', rec.get('supplierCode'))))))
                if pkey:
                    self.reference_manager.register(coll_name, str(pkey), rec)

            # 2. Production-Quality 6-Category Validation Engine Gate
            val_result = self.validation_engine.validate_all(
                coll_name, records, self.reference_manager, self.llm_service
            )

            # Log non-fatal warnings
            for warn in val_result.warnings:
                self.logger.warning(f"[{coll_name}] {warn}")

            # Log deterministic errors
            self.logger.log_validation_result(coll_name, val_result.is_valid, val_result.errors)

            if not val_result.is_valid:
                raise ValueError(f"Quality Gate Failed for collection [{coll_name}]. Deterministic errors: {val_result.errors}")

            # 3. Export JSON Output
            output_path = self.export_manager.export_json(coll_name, records)
            self.logger.info(f"Exported [{len(records)}] records for [{coll_name}] -> {output_path}")

        return collection_data

    def _get_primary_key_field(self, collection_name: str) -> str:
        pk_map = {
            'product_master': 'skuCode',
            'product_planning': 'skuCode',
            'product_pricing': 'skuCode',
            'product_logistics': 'skuCode',
            'plant_master': 'plantCode',
            'warehouse_master': 'warehouseCode',
            'supplier_master': 'supplierCode',
            'customer_channel_master': 'channelCode',
            'production_orders': 'productionOrderNo',
            'purchase_orders': 'poNumber',
            'what_if_scenarios': 'scenarioName'
        }
        return pk_map.get(collection_name, '_id')
