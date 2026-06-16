#!/usr/bin/env python3
"""Copy a handful of real failure traces into the website and render-ready them.

For each source trace we:
  - externalize inline base64 / file-path images into assets/examples/<id>/
  - rewrite image references to relative website paths
  - keep every other field verbatim (no summarizing)
and write the cleaned trace to data/traces/<id>.json, which examples.js fetches.

Run from the website/ directory:  python3 data/build_examples.py
"""
import base64, io, json, os, shutil
from PIL import Image

# repo root that holds data_release/
SRC_ROOT = "/home/jialel/who_when/data_release"
WEB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # website/
ASSETS = os.path.join(WEB, "assets", "examples")
TRACES = os.path.join(WEB, "data", "traces")

# id -> source file (relative to data_release)
DEMOS = {
    "mmsearch_glasses":  "image/mmsearch/smolagents/R.1__task_0245_fashion_0__20260323_212434.json",
    "simpleqa_election": "text/simpleqa_verified/magentic-one/R.1__simpleqav_0094__20260407_184133.json",
    "lvbench_camel":     "video/lvbench/eva/P.1__task_2393__20260423.json",
    "macnet_triangle":   "text/humaneval/macnet/C.3__HumanEval_45__20260407_130958.json",
    "mmsearch_car":      "image/mmsearch/smolagents/PL.1__task_0274_auto_9__20260309_legacy.json",
    "mmsearch_pokemon":  "image/mmsearch/smolagents/R.4__task_0188_general_25__20260309_legacy.json",
}

# per-id verbatim query fixes (source field has a unicode mojibake we repair for display)
QUERY_OVERRIDES = {
    "mmsearch_pokemon": "When will Pokémon Trading Card Game Pocket arrive?",
}


def save_b64(b64, dst, maxw):
    raw = base64.b64decode(b64)
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    if im.width > maxw:
        im = im.resize((maxw, int(im.height * maxw / im.width)))
    im.save(dst, "JPEG", quality=86)


def save_file(src, dst, maxw):
    im = Image.open(src).convert("RGB")
    if im.width > maxw:
        im = im.resize((maxw, int(im.height * maxw / im.width)))
    im.save(dst, "JPEG", quality=86)


def rel(dst):
    return os.path.relpath(dst, WEB).replace(os.sep, "/")


def main():
    os.makedirs(TRACES, exist_ok=True)
    for ex_id, src_rel in DEMOS.items():
        d = json.load(open(os.path.join(SRC_ROOT, src_rel)))
        if ex_id in QUERY_OVERRIDES:
            d["task"]["query"] = QUERY_OVERRIDES[ex_id]
        adir = os.path.join(ASSETS, ex_id)
        if os.path.isdir(adir):
            shutil.rmtree(adir)
        os.makedirs(adir, exist_ok=True)

        # task images (image traces)
        for i, im in enumerate(d.get("task", {}).get("images", []) or []):
            dst = os.path.join(adir, f"query_{i}.jpg")
            save_b64(im["data"], dst, 900)
            d["task"]["images"][i] = {"path": rel(dst)}

        # walk trajectory: externalize any inline images
        for s in d.get("trajectory", []):
            # user-turn images (the task image is echoed into the first turn)
            for i, im in enumerate(s.get("images", []) or []):
                if not isinstance(im, dict) or "data" not in im:
                    continue
                dst = os.path.join(adir, f"turn_img_{i}.jpg")
                save_b64(im["data"], dst, 900)
                s["images"][i] = {"path": rel(dst)}
            for i, im in enumerate(s.get("observation_images", []) or []):
                dst = os.path.join(adir, f"obs_{s.get('step_number')}_{i}.jpg")
                save_b64(im["data"], dst, 820)
                s["observation_images"][i] = {"path": rel(dst)}
            for fr in s.get("frames", []) or []:
                fsrc = os.path.join(SRC_ROOT, os.path.dirname(src_rel), fr["path"])
                dst = os.path.join(adir, f"frame_{fr['index']:04d}.jpg")
                if os.path.exists(fsrc):
                    save_file(fsrc, dst, 640)
                    fr["path"] = rel(dst)

        out = os.path.join(TRACES, ex_id + ".json")
        json.dump(d, open(out, "w"), ensure_ascii=False, indent=2)
        print(f"{ex_id}: {len(d.get('trajectory', []))} steps -> {rel(out)}")


if __name__ == "__main__":
    main()
