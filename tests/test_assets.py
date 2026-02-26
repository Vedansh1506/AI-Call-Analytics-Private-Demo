import io

import routers.assets as assets_router


def register_and_login(client, email="asset@example.com", password="secret123"):
    payload = {
        "first_name": "Asset",
        "last_name": "User",
        "mobile_no": "8888888888",
        "email": email,
        "password": password,
    }
    assert client.post("/auth/register", json=payload).status_code == 201
    login = client.post("/auth/login", data={"username": email, "password": password})
    assert login.status_code == 200
    return login.cookies.get("csrf_token")


def test_upload_constraints_contract(client):
    r = client.get("/assets/upload-constraints")
    assert r.status_code == 200
    body = r.json()
    assert "allowed_extensions" in body
    assert "allowed_mime_types" in body
    assert "max_file_size_mb" in body


def test_upload_enqueues_and_returns_processing(monkeypatch, client):
    csrf = register_and_login(client)
    seen = []

    def fake_delay(asset_id):
        seen.append(asset_id)

    monkeypatch.setattr(assets_router.process_asset_task, "delay", fake_delay)

    fake_mp3 = io.BytesIO(b"ID3\x03\x00\x00\x00\x00\x00\x21" + b"\x00" * 1024)
    files = [("file", ("sample.mp3", fake_mp3, "audio/mpeg"))]

    r = client.post("/assets/upload", files=files, headers={"X-CSRF-Token": csrf})
    assert r.status_code == 201
    assert r.json()["status"] == "processing"
    assert len(seen) == 1


def test_analysis_returns_409_when_not_completed(monkeypatch, client):
    csrf = register_and_login(client, email="state@example.com")
    monkeypatch.setattr(assets_router.process_asset_task, "delay", lambda asset_id: None)

    fake_mp3 = io.BytesIO(b"ID3\x03\x00\x00\x00\x00\x00\x21" + b"\x00" * 1024)
    files = [("file", ("pending.mp3", fake_mp3, "audio/mpeg"))]

    up = client.post("/assets/upload", files=files, headers={"X-CSRF-Token": csrf})
    asset_id = up.json()["asset_file_id"][0]

    check = client.get(f"/assets/{asset_id}/analysis")
    assert check.status_code == 409
