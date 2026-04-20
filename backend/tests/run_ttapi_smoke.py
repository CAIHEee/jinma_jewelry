from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app


BASE_DIR = Path(__file__).resolve().parent
RUN_DIR = BASE_DIR / f"ttapi_run_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
TEXT_PROMPT = (
    "Create a premium jewelry product image of a ruby ring with elegant metalwork, "
    "clear gemstone facets, studio lighting, and a clean luxury visual style."
)
FUSION_PROMPT = (
    "Blend the structure, gemstone presence, and fine jewelry details from both references "
    "into one coherent ring concept image."
)


def save_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def download_image(url: str, target: Path) -> None:
    response = httpx.get(url, timeout=120.0)
    response.raise_for_status()
    target.write_bytes(response.content)


def main() -> None:
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    client = TestClient(app)

    models_response = client.get("/api/v1/ai/models")
    models_response.raise_for_status()
    models = models_response.json()["models"]
    save_json(RUN_DIR / "model_catalog.json", {"models": models})

    text_models = [model for model in models if model["supports_text_to_image"]]
    fusion_models = [model for model in models if model["supports_multi_image_fusion"]]

    generated_images: list[Path] = []
    results_summary: dict[str, Any] = {
        "text_to_image": [],
        "fusion": [],
    }

    for model in text_models:
        payload = {
            "prompt": TEXT_PROMPT,
            "model": model["id"],
            "aspect_ratio": "1:1",
            "size": "1024x1024",
            "image_size": "1K",
            "thinking_level": "Minimal",
        }
        response = client.post("/api/v1/ai/text-to-image", json=payload)
        body = response.json()
        record: dict[str, Any] = {
            "model": model["id"],
            "status_code": response.status_code,
            "response": body,
        }

        if response.status_code == 200 and body.get("image_url"):
            image_path = RUN_DIR / f"text_{model['id']}.png"
            download_image(body["image_url"], image_path)
            record["saved_image"] = str(image_path)
            generated_images.append(image_path)

        save_json(RUN_DIR / f"text_{model['id']}.json", record)
        results_summary["text_to_image"].append(record)

    if len(generated_images) == 1:
        generated_images.append(generated_images[0])

    if len(generated_images) < 2:
        save_json(RUN_DIR / "summary.json", results_summary)
        raise RuntimeError("Fewer than two generated images were saved, cannot continue with fusion tests.")

    reference_a = generated_images[0]
    reference_b = generated_images[1]

    for model in fusion_models:
        with reference_a.open("rb") as file_a, reference_b.open("rb") as file_b:
            response = client.post(
                "/api/v1/ai/fuse-images",
                data={
                    "prompt": FUSION_PROMPT,
                    "model": model["id"],
                    "negative_prompt": "blur, broken structure, duplicated stones",
                    "mode": "balanced",
                    "primary_image_index": "0",
                    "strength": "0.75",
                },
                files=[
                    ("images", (reference_a.name, file_a.read(), "image/png")),
                    ("images", (reference_b.name, file_b.read(), "image/png")),
                ],
            )

        body = response.json()
        record = {
            "model": model["id"],
            "status_code": response.status_code,
            "response": body,
        }

        if response.status_code == 200 and body.get("image_url"):
            image_path = RUN_DIR / f"fusion_{model['id']}.png"
            download_image(body["image_url"], image_path)
            record["saved_image"] = str(image_path)

        save_json(RUN_DIR / f"fusion_{model['id']}.json", record)
        results_summary["fusion"].append(record)

    save_json(RUN_DIR / "summary.json", results_summary)
    print(f"Smoke run completed. Outputs saved to: {RUN_DIR}")


if __name__ == "__main__":
    main()
