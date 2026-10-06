#!/usr/bin/env python3
"""Write drafted demo settings for `vitrin preview` from presets/default.json.

vitrin preview uploads templates/home.json, header.json, footer.json (and layout.json)
from the theme folder as the store's drafted settings. We keep them out of the shipped
theme and generate them only into the preview folder:

    make package && python3 scripts/demo-settings.py build/theme && cd build/theme && vitrin preview <store-id> .

Arabic preset values are mirrored to English when the preset has no English copy.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
target = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "build", "theme")
preset = json.load(open(os.path.join(ROOT, "presets", "default.json"), encoding="utf-8"))
out = {
    "templates/home.jinja": "templates/home.json",
    "header.jinja": "header.json",
    "footer.jinja": "footer.json",
    "layout.jinja": "layout.json",
}


def with_english(settings):
    settings = dict(settings)
    if "components" in settings:  # home: {"components": {"ar": [...]}}
        comps = dict(settings["components"])
        if "ar" in comps and "en" not in comps:
            comps["en"] = comps["ar"]
        settings["components"] = comps
    elif "ar" in settings and "en" not in settings:
        settings["en"] = settings["ar"]
    return settings


for entry in preset["presets"]:
    rel = out.get(entry["path"])
    if not rel:
        continue
    path = os.path.join(target, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(with_english(entry["settings"]), f, ensure_ascii=False, indent=2)
    print("wrote", path)
