"""
LLM Prompt Templates & Fallbacks Module.
Separates all prompt engineering, system instructions, and deterministic fallbacks
from the generation and service logic.
"""

# System Role Prompt
SYSTEM_PROMPT_COPYWRITER = (
    "You are an expert supply chain copywriter for a leading consumer electronics brand like boAt. "
    "Provide concise, professional responses."
)

# User Prompt Templates
PRODUCT_DESCRIPTION_TEMPLATE = (
    "Write a compelling 2-sentence product summary for {brand} {sku_name} ({variant}) in the {category} category."
)

SUPPLIER_PROFILE_TEMPLATE = (
    "Write a 2-sentence corporate profile for electronics manufacturing supplier {supplier_name} "
    "based in {city} with a quality rating of {rating}/5."
)

CONSTRAINT_RECOMMENDATION_TEMPLATE = (
    "Provide a 1-sentence actionable supply chain recommendation for a {severity} severity "
    "{constraint_type} bottleneck at {constraint_source}."
)


# =========================================================================
# DETERMINISTIC FALLBACK TEMPLATES (OFFLINE / DISABLED / LLM UNAVAILABLE)
# =========================================================================

def get_product_description_fallback(sku_name: str, brand: str, category: str, variant: str) -> str:
    return f"{brand} {sku_name} featuring {variant}. Engineered for high performance in {category}."

def get_supplier_profile_fallback(supplier_name: str, city: str, rating: float) -> str:
    return f"{supplier_name} is a premier contract electronics manufacturing partner located in {city}, maintaining an operational quality rating of {rating}/5."

def get_constraint_recommendation_fallback(constraint_type: str, constraint_source: str, severity: str) -> str:
    return f"Immediate Action Required: Shift volume from bottleneck {constraint_source} to qualified secondary assembly line or expedite raw material intake."


# =========================================================================
# PROMPT BUILDER HELPERS
# =========================================================================

def build_product_description_prompt(sku_name: str, brand: str, category: str, variant: str) -> str:
    return PRODUCT_DESCRIPTION_TEMPLATE.format(
        brand=brand,
        sku_name=sku_name,
        variant=variant,
        category=category
    )

def build_supplier_profile_prompt(supplier_name: str, city: str, rating: float) -> str:
    return SUPPLIER_PROFILE_TEMPLATE.format(
        supplier_name=supplier_name,
        city=city,
        rating=rating
    )

def build_constraint_recommendation_prompt(constraint_type: str, constraint_source: str, severity: str) -> str:
    return CONSTRAINT_RECOMMENDATION_TEMPLATE.format(
        severity=severity,
        constraint_type=constraint_type,
        constraint_source=constraint_source
    )
