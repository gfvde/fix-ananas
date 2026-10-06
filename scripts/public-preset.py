#!/usr/bin/env python3
"""Build the store-agnostic preset that merchants apply from the theme editor.

presets/default.json points pickers and links at the dev store's demo products. A
merchant's store has none of those ids, so this swaps them for generic values and
mirrors Arabic content to English, then writes build/preset.json:

    python3 scripts/public-preset.py && vitrin presets create build/preset.json
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = json.load(open(os.path.join(ROOT, "presets", "default.json"), encoding="utf-8"))
STORE_LINK = re.compile(r"^/(categories|products)/.+")


def generic(value):
    if isinstance(value, dict):
        if value.get("type") in ("products_category", "product", "products") and "id" in value:
            return {"id": 0, "type": "recent_products"}
        if set(value) == {"category"}:
            return None
        return {k: generic(v) for k, v in value.items()}
    if isinstance(value, list):
        return [x for x in (generic(v) for v in value) if x is not None]
    if isinstance(value, str) and STORE_LINK.match(value):
        return "/products"
    return value


def with_english(settings):
    if "components" in settings:
        settings["components"].setdefault("en", settings["components"]["ar"])
    elif "ar" in settings:
        settings.setdefault("en", settings["ar"])
    return settings


presets = []
for entry in src["presets"]:
    settings = generic(entry["settings"])
    if entry["path"] == "layout.jinja":
        # Bundle-with-selection needs real products; merchants pick their own.
        for lang in settings.values():
            lang["single_product_section_bundle_products_with_selection"] = []
    presets.append({"path": entry["path"], "settings": with_english(settings)})

out = {
    "type": "default",
    "name": {"en": "Roast", "ar": "روست"},
    "presets": presets,
}
path = os.path.join(ROOT, "build", "preset.json")
os.makedirs(os.path.dirname(path), exist_ok=True)
json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("wrote", path)
