"""Cluster story embeddings into thematic groups (UMAP + DBSCAN).

Reads:  data/embeddings.json, optionally data/enriched.json
Writes: data/clusters.json  (list of {cluster_id, label, member_ids, x, y, size, top_themes})
        data/coords.json     (per-story 2D coordinates for visualization)

Requires:  pip install umap-learn scikit-learn numpy
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np  # type: ignore
import umap  # type: ignore
from sklearn.cluster import DBSCAN  # type: ignore

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def main() -> int:
    embeddings = json.loads((DATA / "embeddings.json").read_text(encoding="utf-8"))
    ids = [r["id"] for r in embeddings]
    X = np.array([r["embedding"] for r in embeddings], dtype=np.float32)
    print(f"Embeddings: {X.shape}", file=sys.stderr)

    # 2D for visualization
    reducer_2d = umap.UMAP(
        n_components=2,
        n_neighbors=20,
        min_dist=0.05,
        metric="cosine",
        random_state=42,
    )
    X2 = reducer_2d.fit_transform(X)

    # Higher-dim projection for cluster quality
    reducer_clu = umap.UMAP(
        n_components=10,
        n_neighbors=20,
        min_dist=0.0,
        metric="cosine",
        random_state=42,
    )
    Xc = reducer_clu.fit_transform(X)

    # DBSCAN tuned for post-UMAP space — smaller eps + min_samples = more clusters.
    # We try a few eps values and pick the one that yields a reasonable number
    # of clusters (8–20) with limited noise.
    best_labels = None
    best_score = -1
    for eps in [0.30, 0.35, 0.40, 0.45, 0.50]:
        db = DBSCAN(eps=eps, min_samples=5, metric="euclidean")
        lab = db.fit_predict(Xc)
        n_clusters = len(set(lab)) - (1 if -1 in lab else 0)
        n_noise = int((lab == -1).sum())
        # Prefer 8-20 clusters with low noise
        if 6 <= n_clusters <= 25 and n_noise < len(ids) * 0.4:
            # Score: prefer more clusters but penalize noise
            s = n_clusters - n_noise * 0.05
            if s > best_score:
                best_score = s
                best_labels = lab
                print(f"  eps={eps}: {n_clusters} clusters, {n_noise} noise (score {s:.1f})", file=sys.stderr)
    labels = best_labels if best_labels is not None else DBSCAN(eps=0.5, min_samples=5).fit_predict(Xc)
    n_noise = int((labels == -1).sum())
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    print(f"Clusters: {n_clusters} (+ noise: {n_noise})", file=sys.stderr)

    # Optional theme labels per cluster from enriched.json
    theme_by_id: dict[str, list[str]] = {}
    enriched = DATA / "enriched.json"
    if enriched.exists():
        for m in json.loads(enriched.read_text(encoding="utf-8")):
            theme_by_id[m["id"]] = m.get("themes", [])

    clusters: dict[int, dict] = {}
    for i, (sid, lab) in enumerate(zip(ids, labels)):
        lab = int(lab)
        if lab == -1:
            continue
        c = clusters.setdefault(
            lab, {"cluster_id": lab, "member_ids": [], "themes": Counter()}
        )
        c["member_ids"].append(sid)
        for t in theme_by_id.get(sid, []):
            c["themes"][t] += 1

    out = []
    for lab, c in sorted(clusters.items()):
        idx = [ids.index(m) for m in c["member_ids"]]
        cx = float(np.mean(X2[idx, 0]))
        cy = float(np.mean(X2[idx, 1]))
        top_theme = c["themes"].most_common(1)
        label = top_theme[0][0] if top_theme else f"Kluster {lab}"
        out.append(
            {
                "cluster_id": lab,
                "label": label,
                "size": len(c["member_ids"]),
                "x": cx,
                "y": cy,
                "member_ids": c["member_ids"],
                "top_themes": [t for t, _ in c["themes"].most_common(5)],
            }
        )

    (DATA / "clusters.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    coords = [
        {"id": sid, "x": float(X2[i, 0]), "y": float(X2[i, 1]), "cluster": int(labels[i])}
        for i, sid in enumerate(ids)
    ]
    (DATA / "coords.json").write_text(
        json.dumps(coords, ensure_ascii=False),
        encoding="utf-8",
    )
    print(
        f"Wrote clusters.json ({len(out)}) and coords.json ({len(coords)})",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
