from fastapi.testclient import TestClient

def test_model_catalog_exposes_expected_models(client: TestClient) -> None:
    response = client.get("/api/v1/ai/models")

    assert response.status_code == 200
    body = response.json()
    model_ids = {item["id"] for item in body["models"]}
    assert "gemini-3.1-flash-image-preview" in model_ids
    assert "gemini-3-pro-image-preview" in model_ids
    assert "flux1-dev" in model_ids
    assert "flux-kontext-pro" in model_ids


def test_text_to_image_rejects_unknown_model(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/v1/ai/text-to-image",
        json={
            "prompt": "test",
            "model": "does-not-exist",
            "aspect_ratio": "1:1",
            "size": "1024x1024",
            "image_size": "1K",
            "thinking_level": "Minimal",
        },
    )

    assert response.status_code == 404


def test_fusion_requires_two_images(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/v1/ai/fuse-images",
        data={
            "prompt": "blend these images",
            "model": "gemini-3.1-flash-image-preview",
            "mode": "balanced",
            "primary_image_index": "0",
            "strength": "0.75",
        },
        files=[("images", ("only-one.png", b"fake-image", "image/png"))],
    )

    assert response.status_code == 400


def test_reference_transform_rejects_unknown_model(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/v1/ai/reference-image-transform",
        data={
            "prompt": "turn this into grayscale relief",
            "model": "does-not-exist",
            "feature": "grayscale_relief",
            "strength": "0.8",
        },
        files={"image": ("reference.png", b"fake-image", "image/png")},
    )

    assert response.status_code == 404
