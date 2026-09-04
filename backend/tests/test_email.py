"""Focused tests for the communication-layer email service.

These tests never perform real network delivery. The unconfigured-SMTP case
(which is exactly what the shared test environment runs) verifies that email is
an honest no-op and reservations still succeed. The "configured" path is
exercised against an explicit in-memory stub transport that records the message
being handed to smtplib — this tests our own send plumbing without fabricating a
real delivery.
"""

import pytest

from app.core.config import Settings
from app.services import email_service
from app.services.email_service import EmailResult

from test_reservations import _payload, NON_CLOSED_DAY


def _configured_settings(**overrides) -> Settings:
    base = dict(
        secret_key="s" * 32,
        admin_password="p" * 8,
        smtp_host="smtp.test.local",
        smtp_port=587,
        smtp_username="user",
        smtp_password="secret",
        smtp_use_tls=False,
        smtp_starttls=True,
        smtp_from="no-reply@test.it",
        smtp_from_name="Test",
    )
    base.update(overrides)
    return Settings(**base)


class _StubSMTP:
    """In-memory stand-in for smtplib.SMTP that records the sent message."""

    def __init__(self, host, port=None, timeout=None):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.starttls_called = False
        self.login_args = None
        self.sent = []
        self.raise_send = None

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def starttls(self):
        self.starttls_called = True

    def login(self, username, password):
        self.login_args = (username, password)

    def sendmail(self, from_addr, to_addrs, msg):
        if self.raise_send:
            raise self.raise_send
        self.sent.append((from_addr, to_addrs, msg))


def test_smtp_not_configured_is_honest_noop():
    settings = _configured_settings(smtp_host="", smtp_username="")
    result = email_service.send_email(to="a@test.it", subject="Hi", body_text="body", settings=settings)
    assert result.success is False
    assert result.reason == "smtp_not_configured"


def test_reservation_created_without_email_returns_email_sent_false(client):
    # The shared test environment has no SMTP configured, so a reservation that
    # succeeds must NOT claim an email was delivered.
    r = client.post("/api/reservations", json=_payload())
    assert r.status_code == 201
    assert r.json()["email_sent"] is False
    assert r.json()["email_reason"] == "smtp_not_configured"
    assert r.json()["status"] == "pending"


def test_send_email_success_path_via_stub(monkeypatch):
    stub = _StubSMTP("smtp.test.local")
    monkeypatch.setattr(email_service.smtplib, "SMTP", lambda host, port, timeout: stub)

    settings = _configured_settings()
    result = email_service.send_email(
        to="guest@test.it",
        subject="Your reservation CASA-ABC123",
        body_text="Dear Maria,\nThank you.",
        settings=settings,
    )
    assert result.success is True
    assert stub.starttls_called is True
    assert stub.login_args == ("user", "secret")
    assert len(stub.sent) == 1
    from_addr, to_addrs, payload = stub.sent[0]
    assert "guest@test.it" in to_addrs
    assert "Subject: Your reservation CASA-ABC123" in payload
    assert "no-reply@test.it" in payload


def test_send_email_failure_is_reported_not_raised(monkeypatch):
    class _RaisingSMTP(_StubSMTP):
        def __init__(self, host, port=None, timeout=None):
            super().__init__(host, port, timeout)
            self.raise_send = ConnectionError("connection refused")

    monkeypatch.setattr(email_service.smtplib, "SMTP", _RaisingSMTP)
    settings = _configured_settings()
    result = email_service.send_email(
        to="guest@test.it", subject="Hi", body_text="body", settings=settings
    )
    assert result.success is False
    assert result.reason == "send_failed"


def test_reservation_email_sent_true_with_configured_stub(client, monkeypatch):
    stub = _StubSMTP("smtp.test.local")
    monkeypatch.setattr(email_service.smtplib, "SMTP", lambda host, port, timeout: stub)
    # Point the email service at a configured SMTP before creating the reservation.
    # (Patches the callable used by email_service's send paths, not the cached
    # module-level get_settings.)
    monkeypatch.setattr(email_service, "get_settings", lambda: _configured_settings())
    # Use a distinct date/email so this test never collides with the other
    # reservation tests in the shared session (same-session duplicates -> 409).
    unique_payload = _payload(email="email-sent@example.it", guests=1)
    r = client.post("/api/reservations", json=unique_payload)
    assert r.status_code == 201
    assert r.json()["email_sent"] is True
    assert any("Subject: Your reservation" in m[2] for m in stub.sent)
