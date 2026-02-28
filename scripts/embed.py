#!/usr/bin/env python3
"""
Pre-compute embeddings for all Ra Material Q&A pairs using nomic-embed-text-v1.5.
Run on GPU machine (5090). Outputs:
  - static/data/embeddings.bin (Float32Array, 768d per vector)
  - static/data/embedding_ids.json (ordered segment IDs)
"""

import json
import struct
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer

MANIFEST_PATH = Path(__file__).parent.parent / "static" / "data" / "manifest.json"
OUTPUT_DIR = Path(__file__).parent.parent / "static" / "data"
MODEL_NAME = "nomic-ai/nomic-embed-text-v1.5"
DIMS = 768


def main():
    print(f"Loading model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME, trust_remote_code=True)

    print(f"Loading manifest: {MANIFEST_PATH}")
    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)

    # Extract segments with their text
    segments = []
    for session in manifest["sessions"]:
        for seg in session["segments"]:
            text = f"{seg['question']} {seg['answer']}".strip()
            # nomic requires "search_document: " prefix for documents
            segments.append({
                "id": seg["id"],
                "text": f"search_document: {text}"
            })

    print(f"Embedding {len(segments)} segments...")
    texts = [s["text"] for s in segments]
    ids = [s["id"] for s in segments]

    # Encode all at once (batched internally by sentence-transformers)
    embeddings = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)
    embeddings = embeddings.astype(np.float32)

    assert embeddings.shape == (len(segments), DIMS), \
        f"Expected ({len(segments)}, {DIMS}), got {embeddings.shape}"

    # Save as raw Float32Array binary (directly loadable in browser)
    bin_path = OUTPUT_DIR / "embeddings.bin"
    with open(bin_path, "wb") as f:
        f.write(embeddings.tobytes())
    print(f"Wrote {bin_path} ({bin_path.stat().st_size / 1024 / 1024:.1f} MB)")

    # Save ordered IDs
    ids_path = OUTPUT_DIR / "embedding_ids.json"
    with open(ids_path, "w") as f:
        json.dump(ids, f)
    print(f"Wrote {ids_path} ({len(ids)} IDs)")

    # Verify
    loaded = np.frombuffer(open(bin_path, "rb").read(), dtype=np.float32)
    loaded = loaded.reshape(-1, DIMS)
    assert loaded.shape == embeddings.shape
    assert np.allclose(loaded, embeddings, atol=1e-6)
    print("Verification passed!")


if __name__ == "__main__":
    main()
