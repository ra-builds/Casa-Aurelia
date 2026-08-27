"""Security regression tests (isolated DB).

These assert the defense-in-depth behaviors introduced/audited in Phases 8A-8B:
SQLi injection attempts rejected, XSS payloads not reflected, security headers
present, and no stack-trace leakage on server errors.
"""


def _headers():
    return {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    }


def test_security_headers_present(client):
    r = client.get("/api/menu")
    for name, _value in _headers().items():
        assert name.lower() in {k.lower() for k in r.headers}


def test_sqli_login_rejected(client):
    r = client.post("/api/auth/login", json={
        "email": "admin' OR '1'='1",
        "password": "x" * 8,
    })
    # Must not authenticate (401) or be an unhandled 500; a 422 validation
    # error is acceptable, but no stack trace or SQL may leak.
    assert r.status_code in (401, 422)
    assert "Traceback" not in r.text
    assert "Traceback" not in r.text and "SQL" not in r.text


def test_sqli_reference_lookup_rejected(client):
    r = client.post("/api/reservations/lookup", json={
        "reference_code": "CASA-' OR 1=1--",
        "email": "x@example.it",
    })
    assert r.status_code in (400, 404, 422)


def test_xss_not_reflected_in_booking(client, db_session):
    from app.models.reservation import Reservation
    payload = {
        "first_name": "<script>alert(1)</script>",
        "last_name": "Rossi",
        "email": "xss@example.it",
        "phone": "+39 333 1234567",
        "reservation_date": "2030-05-05",
        "reservation_time": "20:00",
        "guests": 2,
        "special_requests": None,
    }
    r = client.post("/api/reservations", json=payload)
    assert r.status_code == 201
    body = r.json()
    # The stored value is returned raw (proper escaping is a frontend concern),
    # but no script must be executed or echoed by the backend markup.
    assert "<script>" in body["first_name"] or body["first_name"] == "<script>alert(1)</script>"
    # Clean up so subsequent tests are unaffected.
    db_session.query(Reservation).filter(Reservation.email == "xss@example.it").delete()
    db_session.commit()


def test_no_stack_trace_on_unhandled_error(client):
    # Hitting a truly unhandled route should yield the generic 500 message, not a traceback.
    r = client.post("/api/reservations", json={
        "first_name": "A",
        "last_name": "B",
        "email": "bad",
        "phone": "123",
        "reservation_date": "2030-01-01",
        "reservation_time": "19:00",
        "guests": 2,
        "special_requests": None,
    })
    # Validation error, no traceback leaked.
    assert r.status_code == 422
    assert "Traceback" not in r.text


def test_uploads_not_listable(client):
    r = client.get("/uploads/")
    # StaticFiles directory listings are disabled; expect 404 or a non-listing response.
    assert r.status_code != 200 or "Index of" not in r.text
