import json
import logging
import sys
from datetime import datetime


class Logger:
    """
    Structured logger for telemetry, progress tracking, and validation results.
    """

    def __init__(self, name: str = "SupplyChainGenerator", level: int = logging.INFO):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        if not self.logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)

    def info(self, msg: str, **kwargs):
        if kwargs:
            msg = f"{msg} | {json.dumps(kwargs)}"
        self.logger.info(msg)

    def warning(self, msg: str, **kwargs):
        if kwargs:
            msg = f"{msg} | {json.dumps(kwargs)}"
        self.logger.warning(msg)

    def error(self, msg: str, **kwargs):
        if kwargs:
            msg = f"{msg} | {json.dumps(kwargs)}"
        self.logger.error(msg)

    def log_validation_result(self, collection_name: str, is_valid: bool, errors: list):
        if is_valid:
            self.logger.info(f"VALIDATION PASSED [{collection_name}] - 0 errors")
        else:
            self.logger.error(f"VALIDATION FAILED [{collection_name}] - {len(errors)} errors:")
            for err in errors:
                self.logger.error(f"  - {err}")
