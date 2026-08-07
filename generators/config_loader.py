import os
import re
from pathlib import Path


class ConfigLoader:
    """
    Standard-library pure-Python YAML parser.
    Zero external dependencies required.
    """

    def __init__(self, config_dir: str = "config"):
        self.config_dir = Path(config_dir)

    def _parse_yaml(self, text: str) -> dict:
        lines = text.split('\n')
        root = {}
        current_list = None
        current_dict = None
        current_key = None

        for line in lines:
            raw = line.rstrip()
            stripped = raw.strip()
            if not stripped or stripped.startswith('#'):
                continue

            indent = len(raw) - len(raw.lstrip())

            if stripped.endswith(':') and not stripped.startswith('- '):
                key = stripped[:-1].strip()
                current_key = key
                if indent == 0:
                    current_list = []
                    root[current_key] = current_list
                    current_dict = None
                continue

            if stripped.startswith('- '):
                content = stripped[2:].strip()
                current_dict = {}
                if current_list is not None:
                    current_list.append(current_dict)
                
                if ':' in content:
                    k, v = content.split(':', 1)
                    current_dict[k.strip()] = self._parse_val(v.strip())
                continue

            if current_dict is not None and ':' in stripped:
                k, v = stripped.split(':', 1)
                k = k.strip()
                v = v.strip()
                if not v:
                    # Nested section start under item
                    sub_dict = {}
                    current_dict[k] = sub_dict
                    # Attach following lines to sub_dict
                    current_dict = sub_dict
                else:
                    current_dict[k] = self._parse_val(v)

        return root

    def _parse_val(self, val_str: str):
        val_str = val_str.strip('"\'')
        if val_str.lower() == 'true':
            return True
        if val_str.lower() == 'false':
            return False
        if val_str.lower() in ('null', 'none', '~'):
            return None
        try:
            if '.' in val_str:
                return float(val_str)
            return int(val_str)
        except ValueError:
            return val_str

    def load_file(self, filename: str) -> dict:
        file_path = self.config_dir / filename
        if not file_path.exists():
            return {}

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        return self._parse_yaml(content)

    def load_all(self) -> dict:
        return {
            'products': self.load_file('products.yaml'),
            'plants': self.load_file('plants.yaml'),
            'warehouses': self.load_file('warehouses.yaml'),
            'suppliers': self.load_file('suppliers.yaml'),
            'channels': self.load_file('channels.yaml'),
            'regions': self.load_file('regions.yaml'),
            'holiday_calendar': self.load_file('holiday_calendar.yaml'),
            'promotion_calendar': self.load_file('promotion_calendar.yaml'),
            'business_rules': self.load_file('business_rules.yaml')
        }
