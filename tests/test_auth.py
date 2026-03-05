def register_user(client, email="user1@example.com", password="Secret@123"):
    payload = {
        "first_name": "Test",
        "last_name": "User",
        "mobile_no": "9999999999",
        "email": email,
        "password": password,
    }
    return client.post("/auth/register", json=payload)


def login_user(client, email="user1@example.com", password="Secret@123"):
    return client.post("/auth/login", data={"username": email, "password": password})


def test_register_and_login_sets_cookies(client):
    r1 = register_user(client)
    assert r1.status_code == 201

    r2 = login_user(client)
    assert r2.status_code == 200
    assert "access_token" in r2.cookies
    assert "csrf_token" in r2.cookies


def test_me_requires_auth_and_works_after_login(client):
    r0 = client.get("/api/me")
    assert r0.status_code == 401

    register_user(client, email="me@example.com")
    login_user(client, email="me@example.com")
    r1 = client.get("/api/me")
    assert r1.status_code == 200
    assert r1.json()["email"] == "me@example.com"


def test_logout_requires_csrf(client):
    register_user(client, email="logout@example.com")
    login = login_user(client, email="logout@example.com")
    csrf = login.cookies.get("csrf_token")

    r0 = client.post("/auth/logout")
    assert r0.status_code == 403

    r1 = client.post("/auth/logout", headers={"X-CSRF-Token": csrf})
    assert r1.status_code == 200


def test_lockout_after_repeated_failed_logins(client):
    register_user(client, email="lock@example.com", password="Right@123")

    for _ in range(5):
        bad = login_user(client, email="lock@example.com", password="wrongpass")
        assert bad.status_code == 401

    locked = login_user(client, email="lock@example.com", password="wrongpass")
    assert locked.status_code == 423
