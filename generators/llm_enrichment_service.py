import json
import os
import urllib.request
import urllib.error
from generators.cache_manager import CacheManager
from generators.llm_prompts import (
    SYSTEM_PROMPT_COPYWRITER,
    build_product_description_prompt,
    build_supplier_profile_prompt,
    build_constraint_recommendation_prompt,
    get_product_description_fallback,
    get_supplier_profile_fallback,
    get_constraint_recommendation_fallback,
)


# Helper to load .env file into os.environ if present
def _load_env_file():
    env_path = os.path.join(os.getcwd(), '.env')
    if os.path.exists(env_path):
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        k = k.strip()
                        v = v.strip().strip('"\'')
                        if k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

_load_env_file()


class LLMEnrichmentService:
    """
    OPTIONAL Asynchronous Text Enrichment Service.
    Configured for NVIDIA NIM OpenAI-Compatible API (Kimi K2.6 model).
    
    STRICT BOUNDARY ENFORCEMENT:
    - Never generates or modifies planning data (quantities, inventory, demand, POs, MOQs).
    - Only enriches natural language descriptions, supplier narratives, and executive recommendations.
    - Operates out-of-loop with disk caching.
    - Provides deterministic fallback templates when disabled or offline.
    """

    def __init__(
        self,
        api_key: str = None,
        endpoint: str = "https://integrate.api.nvidia.com/v1/chat/completions",
        model_name: str = "moonshotai/kimik2.6",
        enabled: bool = False,
        cache_manager: CacheManager = None,
        master_seed: int = 42
    ):
        if api_key is not None:
            self.api_key = api_key
        else:
            self.api_key = os.environ.get("NVIDIA_API_KEY", "") or os.environ.get("NVIDIA_NIM_API_KEY", "")

        self.endpoint = endpoint
        self.model_name = model_name
        self.enabled = enabled
        self.cache_manager = cache_manager or CacheManager()
        self.master_seed = master_seed

    def _call_api(self, prompt: str, entity_id: str, system_prompt: str = SYSTEM_PROMPT_COPYWRITER) -> str | None:
        """
        Executes external API call with caching layer.
        """
        cache_key = self.cache_manager.compute_key(self.model_name, prompt, entity_id, self.master_seed)
        cached_res = self.cache_manager.get(cache_key)
        if cached_res:
            return cached_res

        if not self.enabled or not self.api_key:
            return None

        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 150
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        try:
            req = urllib.request.Request(
                self.endpoint,
                data=json.dumps(payload).encode('utf-8'),
                headers=headers,
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode('utf-8'))
                text = result['choices'][0]['message']['content'].strip()
                self.cache_manager.put(cache_key, text)
                return text
        except Exception:
            return None

    def enrich_product_description(self, sku_name: str, brand: str, category: str, variant: str) -> str:
        """
        Enriches product with commercial marketing text.
        """
        prompt = build_product_description_prompt(sku_name, brand, category, variant)
        llm_output = self._call_api(prompt, entity_id=sku_name)
        if llm_output:
            return llm_output
        return get_product_description_fallback(sku_name, brand, category, variant)

    def enrich_supplier_profile(self, supplier_name: str, city: str, rating: float) -> str:
        """
        Enriches supplier master with qualitative operational profile text.
        """
        prompt = build_supplier_profile_prompt(supplier_name, city, rating)
        llm_output = self._call_api(prompt, entity_id=supplier_name)
        if llm_output:
            return llm_output
        return get_supplier_profile_fallback(supplier_name, city, rating)

    def enrich_constraint_recommendation(self, constraint_type: str, constraint_source: str, severity: str) -> str:
        """
        Enriches exception logs with human-readable AI recommendations.
        """
        prompt = build_constraint_recommendation_prompt(constraint_type, constraint_source, severity)
        llm_output = self._call_api(prompt, entity_id=f"{constraint_type}:{constraint_source}")
        if llm_output:
            return llm_output
        return get_constraint_recommendation_fallback(constraint_type, constraint_source, severity)
