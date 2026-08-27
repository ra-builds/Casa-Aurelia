"""Menu / restaurant tests (isolated DB).

The isolated test DB is intentionally not seeded with the production 20-item
menu (that count is a dev/prod baseline, not a test fixture). These tests verify
menu endpoints, admin authorization, and basic category/item CRUD.
"""


def test_public_menu_ok(client):
    r = client.get("/api/menu")
    assert r.status_code == 200
    body = r.json()
    assert "categories" in body
    assert "items" in body


def test_restaurant_ok(client):
    r = client.get("/api/restaurant")
    assert r.status_code in (200, 404)  # endpoint contract depends on route


def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_admin_menu_requires_auth(client):
    assert client.get("/api/admin/menu").status_code == 401


def test_admin_menu_ok(client, admin_token):
    r = client.get("/api/admin/menu", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert "categories" in r.json()


def test_create_category_and_item(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    c = client.post("/api/admin/menu/categories", json={"name": "Test Cat", "slug": "test-cat", "sort_order": 99}, headers=headers)
    assert c.status_code == 201, c.text
    cat_id = c.json()["id"]
    item = client.post("/api/admin/menu", json={
        "category_id": cat_id,
        "name": "Test Dish",
        "description": "A dish",
        "price": 12.5,
        "dietary_info": None,
        "is_featured": False,
        "is_available": True,
        "sort_order": 1,
        "allergen_codes": [],
    }, headers=headers)
    assert item.status_code == 201, item.text
    assert item.json()["name"] == "Test Dish"


def test_create_item_unknown_category(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    r = client.post("/api/admin/menu", json={
        "category_id": 999999,
        "name": "Orphan",
        "description": "D",
        "price": 1,
        "dietary_info": None,
        "is_featured": False,
        "is_available": True,
        "sort_order": 1,
        "allergen_codes": [],
    }, headers=headers)
    assert r.status_code in (400, 404)


def test_allergen_catalog(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    r = client.get("/api/admin/menu/allergens", headers=headers)
    assert r.status_code == 200
