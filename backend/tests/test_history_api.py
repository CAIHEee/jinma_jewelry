from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_history_create_and_list() -> None:
    create_response = client.post(
        "/api/v1/history",
        json={
            "kind": "text_to_image",
            "title": "History smoke item",
            "model": "gemini-3-pro-image-preview",
            "provider": "gemini",
            "status": "completed",
            "prompt": "test history prompt",
            "image_url": "https://example.com/test.png",
            "storage_url": "https://example.com/test.png",
            "metadata": {"source": "test"},
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["title"] == "History smoke item"

    list_response = client.get("/api/v1/history")
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    assert any(item["id"] == created["id"] for item in items)
