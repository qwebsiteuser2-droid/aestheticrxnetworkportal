#!/usr/bin/env python3
"""
AI Product Catalogue Builder & Image Enhancement Pipeline
Quality-over-quantity processing for medical aesthetics product photos.
Never modifies originals.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import shutil
from collections import defaultdict
from dataclasses import dataclass, asdict, field
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageStat

SRC = Path("/home/engmatix/qasim_ai/aestheticrxnetworkportal/prodcuts catalouge")
OUT = Path("/home/engmatix/qasim_ai/aestheticrxnetworkportal/product_catalogue_processed")
TARGET_LONG = 2400  # px longest side for export
MIN_READY_SCORE = 52
MAX_RESIDUAL_SKIN = 0.015  # after enhancement — visible hands ⇒ not Ready
MAX_PRODUCTS = 35


# ---------------------------------------------------------------------------
# Known brand / product patterns for naming (from packaging text heuristics)
# ---------------------------------------------------------------------------
BRAND_KEYWORDS = [
    ("Profhilo", "Skin Booster", "Profhilo is a hyaluronic-acid based injectable skin booster designed to improve skin hydration, firmness, and overall tissue quality. It is widely used in aesthetic clinics for bioremodelling of the face and neck."),
    ("Juvederm", "Dermal Filler", "Juvéderm is a family of hyaluronic-acid dermal fillers used to restore volume, contour facial features, and soften lines. Formulations vary by indication and rheology for different treatment areas."),
    ("Restylane", "Dermal Filler", "Restylane is a hyaluronic-acid dermal filler range used for facial contouring, volume restoration, and wrinkle correction in professional aesthetic practice."),
    ("GFCCELL", "Mesotherapy", "GFCCELL EXO Scalp Kit is a professional scalp mesotherapy kit combining powder and peptide solution vials for topical aesthetic scalp protocols. Store and handle according to manufacturer instructions."),
    ("GFC", "Mesotherapy", "GFC Life Science professional aesthetic kit for clinic-based mesotherapy and regenerative skin protocols. Refer to packaging for composition and storage requirements."),
    ("Glutax", "Skin Booster", "Glutax is a professional aesthetic skin-booster / whitening-oriented injectable kit line from Dermedical Skin Sciences, typically supplied as multi-vial sets for clinic use."),
    ("DERMEDICAL", "Skin Booster", "Dermedical Skin Sciences professional injectable / skin-booster line for clinic aesthetic protocols. Packaging lists composition and storage guidance for trained practitioners."),
    ("Roche", "Injectable", "Roche Nicholas / Laboratoires Roche Nicholas injectable vitamin C preparation for professional parenteral use when indicated. For healthcare professional administration only."),
    ("ROCHE NICHOLAS", "Injectable", "Laboratoires Roche Nicholas injectable vitamin preparation for professional clinical use. Follow labelled indications and storage instructions."),
    ("Botox", "Botulinum Toxin", "Botulinum toxin type A product for aesthetic and therapeutic use by licensed practitioners. Exact formulation and dilution follow the specific labelled product."),
    ("Dysport", "Botulinum Toxin", "Botulinum toxin type A (abobotulinumtoxinA) for professional aesthetic use. Administered only by qualified practitioners per labelled guidance."),
    ("Xeomin", "Botulinum Toxin", "IncobotulinumtoxinA (Xeomin) for professional aesthetic use by licensed clinicians according to the product label."),
    ("Sculptra", "Injectable", "Sculptra (poly-L-lactic acid) is a biostimulatory injectable used to support gradual volume restoration in aesthetic practice."),
    ("Radiesse", "Dermal Filler", "Radiesse is a calcium hydroxylapatite injectable filler used for volume and contour support in professional aesthetic treatments."),
    ("Belotero", "Dermal Filler", "Belotero is a hyaluronic-acid dermal filler range designed for integration into superficial to deeper facial tissue planes."),
    ("Teosyal", "Dermal Filler", "Teosyal is a hyaluronic-acid dermal filler portfolio for facial volume, contouring, and wrinkle correction."),
    ("Filorga", "Skin Booster", "Filorga NCTF / aesthetic mesotherapy lines are used in professional clinics for skin quality and biorevitalisation protocols."),
    ("NCTF", "Mesotherapy", "NCTF is a professional mesotherapy / skin-quality cocktail used in aesthetic clinics for multi-point intradermal protocols."),
    ("Rejuran", "Skin Booster", "Rejuran (PN / polynucleotide) skin boosters are used in aesthetic practice to support skin quality and repair-oriented protocols."),
    ("Jalupro", "Skin Booster", "Jalupro is an amino-acid / HA skin-booster line for professional aesthetic biorevitalisation treatments."),
    ("Sunekos", "Skin Booster", "Sunekos combines hyaluronic acid with amino acids for professional aesthetic skin-booster protocols."),
    ("Aqualyx", "Injectable", "Aqualyx is a professional injectable used in body-contouring aesthetic protocols by trained practitioners."),
    ("Ellanse", "Dermal Filler", "Ellansé is a collagen-stimulating dermal filler (PCL-based) used for volume and contour in aesthetic practice."),
    ("Hyaluronidase", "Medical Device", "Hyaluronidase enzyme preparation used by clinicians to manage hyaluronic-acid filler dissolution when indicated."),
    ("Cannula", "Cannula", "Sterile aesthetic cannula for filler and injectable delivery techniques in professional practice."),
    ("Needle", "Needle", "Sterile medical needle for injectable aesthetic procedures. Gauge and length as labelled."),
]


def slugify(name: str) -> str:
    s = re.sub(r"[^\w\s\-]+", "", name, flags=re.UNICODE).strip()
    s = re.sub(r"\s+", "_", s)
    return s[:80] or "Unknown_Product"


def laplace_variance(gray: np.ndarray) -> float:
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def estimate_glare_ratio(img: np.ndarray) -> float:
    """Specular hotspots on the subject — ignore pure white studio background."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Exclude near-pure white studio fill from both count and denominator
    subject = gray < 250
    if int(subject.sum()) < 500:
        return 0.0
    local = cv2.GaussianBlur(gray, (21, 21), 0)
    hotspot = (gray.astype(np.int16) - local.astype(np.int16)) > 35
    specular = (hsv[:, :, 2] > 242) & (hsv[:, :, 1] < 35) & hotspot & subject
    return float(specular.sum() / subject.sum())


def estimate_skin_ratio(img: np.ndarray) -> float:
    """Rough YCrCb skin mask — detects hands holding packaging."""
    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    mask = cv2.inRange(ycrcb, (0, 133, 77), (255, 173, 127))
    # Ignore edges slightly
    h, w = mask.shape
    margin = int(min(h, w) * 0.05)
    core = mask[margin : h - margin, margin : w - margin]
    return float(np.mean(core > 0))


def background_edge_variance(img: np.ndarray) -> float:
    """Higher = busier background near borders."""
    h, w = img.shape[:2]
    border = np.concatenate(
        [
            img[: max(1, h // 12), :].reshape(-1, 3),
            img[-max(1, h // 12) :, :].reshape(-1, 3),
            img[:, : max(1, w // 12)].reshape(-1, 3),
            img[:, -max(1, w // 12) :].reshape(-1, 3),
        ]
    )
    return float(np.std(border.astype(np.float32)))


def ahash(img: np.ndarray, hash_size: int = 8) -> str:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, (hash_size, hash_size), interpolation=cv2.INTER_AREA)
    avg = resized.mean()
    bits = (resized > avg).flatten()
    value = 0
    for b in bits:
        value = (value << 1) | int(b)
    return f"{value:016x}"


def hamming(a: str, b: str) -> int:
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def color_signature(img: np.ndarray) -> np.ndarray:
    small = cv2.resize(img, (32, 32), interpolation=cv2.INTER_AREA)
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV).astype(np.float32)
    return np.concatenate(
        [
            hsv.mean(axis=(0, 1)),
            hsv.std(axis=(0, 1)),
            small.mean(axis=(0, 1)),
        ]
    )


@dataclass
class ImageScore:
    path: str
    filename: str
    width: int
    height: int
    sharpness: float
    glare_ratio: float
    skin_ratio: float
    bg_clutter: float
    brightness: float
    score: float
    ahash: str
    color_sig: list
    needs_edit: bool
    unsalvageable: bool
    notes: list = field(default_factory=list)


def score_image(path: Path) -> ImageScore:
    bgr = cv2.imread(str(path))
    if bgr is None:
        return ImageScore(
            str(path), path.name, 0, 0, 0, 1, 1, 999, 0, 0, "0", [], False, True, ["unreadable"]
        )
    h, w = bgr.shape[:2]
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    sharp = laplace_variance(gray)
    glare = estimate_glare_ratio(bgr)
    skin = estimate_skin_ratio(bgr)
    clutter = background_edge_variance(bgr)
    brightness = float(np.mean(gray))
    notes = []

    # Composite score 0–100
    score = 0.0
    # Sharpness (0-30)
    score += min(30.0, sharp / 15.0)
    # Resolution (0-15) — all are 1500 so baseline
    score += 12.0 if min(w, h) >= 1000 else 5.0
    # Low glare (0-15)
    score += max(0.0, 15.0 * (1.0 - min(1.0, glare / 0.12)))
    # Low hand (0-20)
    score += max(0.0, 20.0 * (1.0 - min(1.0, skin / 0.18)))
    # Cleaner bg (0-10)
    score += max(0.0, 10.0 * (1.0 - min(1.0, clutter / 80.0)))
    # Exposure mid (0-10)
    score += max(0.0, 10.0 * (1.0 - abs(brightness - 128) / 128.0))

    unsalvageable = False
    if sharp < 40:
        notes.append("very soft / motion blur")
        unsalvageable = True
    if glare > 0.18:
        notes.append("severe glare")
    if skin > 0.25:
        notes.append("heavy hand obstruction")
    if brightness < 40 or brightness > 230:
        notes.append("extreme exposure")
        unsalvageable = True

    needs_edit = (skin > 0.06) or (clutter > 35) or (glare > 0.05) or (sharp < 120)

    return ImageScore(
        path=str(path),
        filename=path.name,
        width=w,
        height=h,
        sharpness=round(sharp, 2),
        glare_ratio=round(glare, 4),
        skin_ratio=round(skin, 4),
        bg_clutter=round(clutter, 2),
        brightness=round(brightness, 2),
        score=round(score, 2),
        ahash=ahash(bgr),
        color_sig=color_signature(bgr).tolist(),
        needs_edit=needs_edit,
        unsalvageable=unsalvageable,
        notes=notes,
    )


def cluster_images(scores: list[ImageScore], ham_thresh: int = 8, color_thresh: float = 28.0):
    """Greedy clustering by tight aHash (+ mild color) to avoid mixing brands."""
    clusters: list[list[ImageScore]] = []
    for s in sorted(scores, key=lambda x: -x.score):
        placed = False
        sig = np.array(s.color_sig, dtype=np.float32)
        for cluster in clusters:
            rep = cluster[0]
            hd = hamming(s.ahash, rep.ahash)
            if hd <= ham_thresh:
                cluster.append(s)
                placed = True
                break
            dist = float(np.linalg.norm(sig - np.array(rep.color_sig, dtype=np.float32)))
            if hd <= ham_thresh + 3 and dist < color_thresh:
                cluster.append(s)
                placed = True
                break
        if not placed:
            clusters.append([s])
    return clusters


def resolve_identity(cluster: list[ImageScore], id_map: dict, fallback_idx: int) -> dict:
    for s in sorted(cluster, key=lambda x: -x.score):
        if s.filename in id_map:
            return id_map[s.filename]
    return {
        "product_name": f"Clinic Packaging Product {fallback_idx:02d}",
        "folder": f"Clinic_Packaging_Product_{fallback_idx:02d}",
        "category": "Unknown",
        "description": (
            f"Clinic packaging product {fallback_idx:02d} photographed from physical box artwork. "
            "Exact brand and formulation should be confirmed from the original packaging before publishing clinical claims. "
            "Intended for professional aesthetic catalogue presentation."
        ),
    }


def enhance_to_white_bg(bgr: np.ndarray) -> tuple[np.ndarray, list[str]]:
    """
    Conservative enhancement: grabCut-ish subject isolation + white studio bg,
    mild straighten via minAreaRect, color/contrast polish. No label hallucination.
    """
    changes: list[str] = []
    h, w = bgr.shape[:2]
    work = bgr.copy()

    # Mild auto-levels via CLAHE on L channel
    lab = cv2.cvtColor(work, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l2 = clahe.apply(l)
    work = cv2.cvtColor(cv2.merge([l2, a, b]), cv2.COLOR_LAB2BGR)
    changes.append("Contrast / exposure optimized (CLAHE)")

    # Soft white-balance towards mid gray
    avg = work.reshape(-1, 3).mean(axis=0) + 1e-6
    scale = (avg.mean() / avg).astype(np.float32)
    work = np.clip(work.astype(np.float32) * scale, 0, 255).astype(np.uint8)
    changes.append("White balance corrected")

    # Subject mask via edge + flood from borders (assume product is central)
    gray = cv2.cvtColor(work, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 40, 120)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    edges = cv2.dilate(edges, kernel, iterations=2)

    # GrabCut on downscaled image for speed, then upsample mask
    mask = np.zeros(gray.shape, np.uint8)
    margin_x, margin_y = int(w * 0.08), int(h * 0.08)
    rect = (margin_x, margin_y, w - 2 * margin_x, h - 2 * margin_y)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    try:
        small = cv2.resize(work, (min(640, w), min(640, h)), interpolation=cv2.INTER_AREA)
        sh, sw = small.shape[:2]
        smask = np.zeros((sh, sw), np.uint8)
        sx, sy = int(sw * 0.08), int(sh * 0.08)
        srect = (sx, sy, sw - 2 * sx, sh - 2 * sy)
        cv2.grabCut(small, smask, srect, bgd, fgd, 2, cv2.GC_INIT_WITH_RECT)
        smask2 = np.where((smask == 2) | (smask == 0), 0, 255).astype("uint8")
        mask2 = cv2.resize(smask2, (w, h), interpolation=cv2.INTER_LINEAR)
        # Refine: remove skin-like regions outside a protected centre box
        ycrcb = cv2.cvtColor(work, cv2.COLOR_BGR2YCrCb)
        skin = cv2.inRange(ycrcb, (0, 133, 77), (255, 173, 127))
        skin = cv2.morphologyEx(skin, cv2.MORPH_CLOSE, kernel, iterations=2)
        protect = np.zeros_like(skin)
        protect[int(h * 0.22) : int(h * 0.78), int(w * 0.18) : int(w * 0.82)] = 255
        skin_erase = cv2.bitwise_and(skin, cv2.bitwise_not(protect))
        # Always clear a thicker border band (hands typically grip edges)
        b = max(16, min(h, w) // 12)
        skin_erase[:b, :] = 255
        skin_erase[-b:, :] = 255
        skin_erase[:, :b] = 255
        skin_erase[:, -b:] = 255
        # Also clear floor / feet: bottom 18% if skin or dark clutter
        bottom = skin_erase.copy()
        bottom[: int(h * 0.82), :] = 0
        mask2[skin_erase > 0] = 0
        mask2[bottom > 0] = 0
        # Keep largest connected component only (the packaging)
        num, labels, stats, _ = cv2.connectedComponentsWithStats((mask2 > 127).astype(np.uint8), 8)
        if num > 1:
            # label 0 is background
            areas = stats[1:, cv2.CC_STAT_AREA]
            keep = 1 + int(np.argmax(areas))
            mask2 = np.where(labels == keep, 255, 0).astype(np.uint8)
        mask2 = cv2.GaussianBlur(mask2, (7, 7), 0)
        alpha = (mask2.astype(np.float32) / 255.0)[..., None]
        white = np.full_like(work, 255)
        composed = (work.astype(np.float32) * alpha + white.astype(np.float32) * (1 - alpha)).astype(
            np.uint8
        )
        changes.append("Background replaced with pure white")
        changes.append("Peripheral hand / clutter suppressed")
        work = composed
    except Exception:
        # Fallback: light vignette toward white at borders
        yy, xx = np.mgrid[0:h, 0:w]
        cy, cx = h / 2, w / 2
        r = np.sqrt(((yy - cy) / (h / 2)) ** 2 + ((xx - cx) / (w / 2)) ** 2)
        alpha = np.clip(1.2 - r, 0, 1)[..., None]
        white = np.full_like(work, 255)
        work = (work.astype(np.float32) * alpha + white.astype(np.float32) * (1 - alpha)).astype(
            np.uint8
        )
        changes.append("Studio vignette toward white (fallback)")

    # Crop to content bounding box of non-white pixels
    gray2 = cv2.cvtColor(work, cv2.COLOR_BGR2GRAY)
    nonwhite = gray2 < 248
    ys, xs = np.where(nonwhite)
    if len(xs) > 100:
        x0, x1 = xs.min(), xs.max()
        y0, y1 = ys.min(), ys.max()
        pad = int(0.06 * max(x1 - x0, y1 - y0))
        x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
        x1, y1 = min(w - 1, x1 + pad), min(h - 1, y1 + pad)
        work = work[y0 : y1 + 1, x0 : x1 + 1]
        changes.append("Professional ecommerce crop")

    # Upscale if needed
    hh, ww = work.shape[:2]
    long_side = max(hh, ww)
    if long_side < TARGET_LONG:
        scale = TARGET_LONG / long_side
        work = cv2.resize(work, (int(ww * scale), int(hh * scale)), interpolation=cv2.INTER_CUBIC)
        work = cv2.bilateralFilter(work, 5, 40, 40)
        changes.append(f"Upscaled to ~{TARGET_LONG}px longest side")

    # Mild unsharp
    blur = cv2.GaussianBlur(work, (0, 0), 1.2)
    work = cv2.addWeighted(work, 1.25, blur, -0.25, 0)
    changes.append("Subtle sharpening")

    return work, changes


def qa_processed(bgr: np.ndarray) -> dict:
    """Post-edit QA — residual hands decide Ready; glare is advisory only."""
    skin = estimate_skin_ratio(bgr)
    glare = estimate_glare_ratio(bgr)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    sharp = laplace_variance(gray)
    # White packaging photos often trip naive glare metrics; gate on skin + sharpness
    ok = skin <= MAX_RESIDUAL_SKIN and sharp >= 35 and glare < 0.08
    return {
        "residual_skin": round(skin, 4),
        "residual_glare": round(glare, 4),
        "sharpness": round(sharp, 2),
        "catalogue_ready": ok,
    }


def stars(score: float) -> str:
    n = max(1, min(5, int(round(score / 20))))
    return "★" * n + "☆" * (5 - n)


def infer_category_from_name(name: str) -> str:
    for key, cat, _ in BRAND_KEYWORDS:
        if key.lower() in name.lower():
            return cat
    return "Unknown"


def description_for(name: str) -> str:
    for key, _, desc in BRAND_KEYWORDS:
        if key.lower() in name.lower():
            return desc
    return (
        f"{name} is a professional medical aesthetics product photographed from clinic packaging. "
        "Verify exact formulation, indications, and storage against the manufacturer label before listing claims. "
        "Intended for use by qualified aesthetic practitioners."
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    files = sorted(SRC.glob("*.jpeg")) + sorted(SRC.glob("*.jpg"))
    print(f"Scanning {len(files)} images from {SRC}")

    scores = [score_image(p) for p in files]
    scores_by_file = {s.filename: s for s in scores}

    # Mark near-duplicates
    duplicate_of: dict[str, str] = {}
    for i, a in enumerate(scores):
        for b in scores[i + 1 :]:
            if hamming(a.ahash, b.ahash) <= 4:
                duplicate_of[b.filename] = a.filename

    clusters = cluster_images(scores)
    print(f"Formed {len(clusters)} visual clusters")

    # Rank clusters by best image score; keep top MAX_PRODUCTS viable ones
    cluster_meta = []
    for idx, cluster in enumerate(clusters):
        best = max(cluster, key=lambda s: s.score)
        avg = sum(s.score for s in cluster) / len(cluster)
        cluster_meta.append(
            {
                "id": idx,
                "cluster": cluster,
                "best": best,
                "avg": avg,
                "size": len(cluster),
            }
        )
    cluster_meta.sort(key=lambda c: (-c["best"].score, -c["avg"], -c["size"]))

    # Provisional names: Product_XX until visual ID map applied
    # Load optional ID map if present
    id_map_path = OUT / "_product_id_map.json"
    id_map: dict[str, dict] = {}
    if id_map_path.exists():
        id_map = json.loads(id_map_path.read_text())

    products_out = []
    catalogue_sections = []
    edited_count = 0
    unchanged_count = 0
    needs_better = 0
    successful = 0

    # Merge clusters that share the same mapped product folder/name
    merged: dict[str, list[ImageScore]] = {}
    unmapped_clusters = []
    for meta in cluster_meta:
        identity = resolve_identity(meta["cluster"], id_map, meta["id"] + 1)
        key = identity.get("folder") or identity.get("product_name")
        if key.startswith("Clinic_Packaging_Product_"):
            unmapped_clusters.append((meta, identity))
        else:
            merged.setdefault(key, []).extend(meta["cluster"])

    # Keep best unmapped clusters to reach up to MAX_PRODUCTS
    selected_products = []
    for folder, imgs in merged.items():
        identity = resolve_identity(imgs, id_map, 0)
        best = max(imgs, key=lambda s: s.score)
        selected_products.append(
            {"identity": identity, "cluster": imgs, "best": best, "avg": sum(s.score for s in imgs) / len(imgs)}
        )
    unmapped_clusters.sort(key=lambda x: -x[0]["best"].score)
    for meta, identity in unmapped_clusters:
        if len(selected_products) >= MAX_PRODUCTS:
            break
        # Quality-over-quantity: only keep strong unmapped candidates
        if meta["best"].score < 55:
            continue
        selected_products.append(
            {
                "identity": identity,
                "cluster": meta["cluster"],
                "best": meta["best"],
                "avg": meta["avg"],
            }
        )

    selected_products.sort(key=lambda c: (-c["best"].score, -c["avg"]))
    selected_products = selected_products[:MAX_PRODUCTS]

    for i, meta in enumerate(selected_products, start=1):
        cluster = meta["cluster"]
        identity = meta["identity"]
        product_name = identity["product_name"]
        category = identity.get("category", "Unknown")
        description = identity.get("description") or description_for(product_name)
        folder_name = identity.get("folder") or slugify(product_name)

        folder = OUT / folder_name
        # clean previous outputs for this product folder
        if folder.exists():
            shutil.rmtree(folder)
        folder.mkdir(parents=True, exist_ok=True)

        # Rank images in cluster
        ranked = sorted(cluster, key=lambda s: -s.score)
        # Deduplicate near-identical for primary selection
        primary: list[str] = []
        secondary: list[str] = []
        primary_qa: list[dict] = []
        changes_all: list[str] = []
        used_hashes = []

        for j, s in enumerate(ranked):
            # skip near-dup of already kept image for export density control
            if any(hamming(s.ahash, uh) <= 3 for uh in used_hashes) and j > 0:
                continue
            used_hashes.append(s.ahash)
            role = "primary" if len(primary) < 2 else "secondary"
            if role == "secondary" and len(secondary) >= 4:
                continue

            src_path = Path(s.path)
            out_name = f"{'primary' if role == 'primary' else 'secondary'}_{len(primary)+len(secondary)+1:02d}_{src_path.stem}.jpeg"

            bgr = cv2.imread(str(src_path))
            if bgr is None:
                continue

            applied: list[str] = []
            if s.unsalvageable and s.score < 35:
                out_bgr = bgr
                applied = ["Unchanged — marked needs better source"]
                unchanged_count += 1
            elif s.needs_edit and s.score >= 35:
                out_bgr, applied = enhance_to_white_bg(bgr)
                edited_count += 1
            else:
                if s.needs_edit:
                    out_bgr, applied = enhance_to_white_bg(bgr)
                    edited_count += 1
                else:
                    out_bgr = bgr
                    hh, ww = out_bgr.shape[:2]
                    if max(hh, ww) < TARGET_LONG:
                        scale = TARGET_LONG / max(hh, ww)
                        out_bgr = cv2.resize(
                            out_bgr, (int(ww * scale), int(hh * scale)), interpolation=cv2.INTER_CUBIC
                        )
                        applied = ["Upscaled only — source already clean"]
                        edited_count += 1
                    else:
                        applied = ["Unchanged — already suitable"]
                        unchanged_count += 1

            out_path = folder / out_name
            cv2.imwrite(str(out_path), out_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
            qa = qa_processed(out_bgr)
            meta_side = {
                "source": src_path.name,
                "role": role,
                "score": s.score,
                "duplicate_of": duplicate_of.get(s.filename),
                "changes": applied,
                "notes": s.notes,
                "qa": qa,
            }
            (folder / f"{out_name}.meta.json").write_text(json.dumps(meta_side, indent=2))

            if role == "primary":
                primary.append(out_name)
                primary_qa.append(qa)
            else:
                secondary.append(out_name)
            for c in applied:
                if c not in changes_all:
                    changes_all.append(c)

        best_score = ranked[0].score if ranked else 0
        # Ready if at least one primary passes post-edit QA
        any_primary_clean = any(q.get("catalogue_ready") for q in primary_qa)
        # Demote: if source had heavy hands and residual skin still elevated on best primary
        best_primary_skin = min((q.get("residual_skin", 1.0) for q in primary_qa), default=1.0)
        residual_hands = best_primary_skin > MAX_RESIDUAL_SKIN
        if best_score >= MIN_READY_SCORE and primary and any_primary_clean and not residual_hands:
            status = "Ready"
            successful += 1
        else:
            status = "Needs Better Source Image"
            needs_better += 1
            if primary and not any_primary_clean:
                changes_all.append("QA: residual hands/glare — needs better source photo")

        product_record = {
            "folder": folder_name,
            "product_name": product_name,
            "status": status,
            "category": category,
            "primary_images": primary,
            "secondary_images": secondary,
            "changes": changes_all,
            "best_score": best_score,
            "source_count": len(ranked),
            "duplicates_marked": sum(1 for s in ranked if s.filename in duplicate_of),
            "primary_qa": primary_qa,
        }
        products_out.append(product_record)

        catalogue_sections.append(
            f"""# {product_name}

Folder:
{folder_name}

Status:
{status}

Category:
{category}

Description:

{description}

Primary Images

{chr(10).join('- ' + p for p in primary) or '- (none)'}

Secondary Images

{chr(10).join('- ' + p for p in secondary) or '- (none)'}

Image Quality

{stars(best_score)} ({best_score}/100)

Editing Performed

{chr(10).join('- ' + c for c in changes_all) or '- None'}

Notes

Cluster size: {len(ranked)} source photo(s). Duplicates marked: {product_record['duplicates_marked']}.
Source best file: `{ranked[0].filename if ranked else 'n/a'}`.
{'; '.join(ranked[0].notes) if ranked and ranked[0].notes else 'Processed for white-studio ecommerce presentation without altering packaging artwork text.'}

"""
        )

        print(f"[{i}/{len(selected_products)}] {folder_name} — {status} — score {best_score}")

    # Write inventory of ALL clusters for ID mapping assistance
    inventory = []
    for meta in cluster_meta:
        inventory.append(
            {
                "cluster_id": meta["id"],
                "size": meta["size"],
                "best_score": meta["best"].score,
                "best_file": meta["best"].filename,
                "files": [s.filename for s in meta["cluster"]],
            }
        )
    (OUT / "_cluster_inventory.json").write_text(json.dumps(inventory, indent=2))
    (OUT / "_image_scores.json").write_text(
        json.dumps([asdict(s) for s in scores], indent=2)
    )

    report = {
        "total_products": len(products_out),
        "total_images": len(files),
        "edited_images": edited_count,
        "unchanged_images": unchanged_count,
        "needs_better_images": needs_better,
        "successful_products": successful,
        "source_directory": str(SRC),
        "output_directory": str(OUT),
        "note": "Source dataset was a flat folder of UUID-named JPEGs; products were clustered visually. Update _product_id_map.json with brand names then re-run to rename folders.",
        "products": products_out,
    }
    (OUT / "processing_report.json").write_text(json.dumps(report, indent=2))

    md = f"""# AestheticRxNetwork — Product Catalogue

Professional medical aesthetics catalogue assets generated from clinic packaging photographs.

**Quality policy:** authenticity over aggressive AI editing. Packaging text, logos, barcodes, and colours are never invented. Images that cannot be recovered honestly are marked **Needs Better Source Image**.

**Source:** `{SRC.name}` ({len(files)} images)  
**Processed products in this catalogue:** {len(products_out)}  
**Ready:** {successful} · **Needs better source:** {needs_better}

---

"""
    md += "\n---\n\n".join(catalogue_sections)
    md += f"""

---

## Processing summary

- Total source images: {len(files)}
- Visual product clusters selected: {len(products_out)}
- Edited images: {edited_count}
- Unchanged images: {unchanged_count}
- Successful (Ready) products: {successful}

See `processing_report.json` for machine-readable details.
"""
    (OUT / "PRODUCT_CATALOGUE.md").write_text(md)
    print("Wrote PRODUCT_CATALOGUE.md and processing_report.json")
    print(json.dumps({k: report[k] for k in report if k != "products"}, indent=2))


if __name__ == "__main__":
    main()
