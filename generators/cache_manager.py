import hashlib
import json
import os
from pathlib import Path


class CacheManager:
    """
    Disk-backed persistent cache for LLM text enrichment outputs.
    Ensures LLM calls are generated once and reused across repeat runs.
    """

    def __init__(self, cache_dir: str = ".cache/llm_enrichment"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def compute_key(self, model_name: str, prompt: str, entity_id: str, seed: int) -> str:
        """
        Calculates a unique SHA-256 cache key based on prompt parameters.
        """
        payload = f"{model_name}:{prompt}:{entity_id}:{seed}"
        return hashlib.sha256(payload.encode('utf-8')).hexdigest()

    def get(self, cache_key: str) -> str | None:
        """
        Retrieves cached response text if available.
        """
        file_path = self.cache_dir / f"{cache_key}.json"
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get('response')
            except Exception:
                return None
        return None

    def put(self, cache_key: str, response_text: str):
        """
        Stores response text into local disk cache.
        """
        file_path = self.cache_dir / f"{cache_key}.json"
        data = {
            'cache_key': cache_key,
            'response': response_text
        }
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
