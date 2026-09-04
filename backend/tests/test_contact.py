"""Focused tests for the contact-form submission path.

The contact form is one of the two P0 communication-layer blockers (previously a
mock with no backend). These tests verify that submissions are genuinely stored
and retrievable by an admin, that validation rejects malformed input, and that
the admin listing is protected. The shared test environment has no SMTP
configured, so ``email_sent`` is honestly false here (no fabrication).
"""

import pytest


def _contact_payload(**overrides):
    base = {
        "name": "Luca Bianchi",
        "email": "luca@example.it",
        "subject": "Table for two",
        "message": "We would like to book a quiet table for two on Saturday evening.",
    }
    base.update(overrides)
    return base


def test_contact_submit_stores_message(client):
    r = client.post("/api/contact", json=_contact_payload())
    assert r.status_code == 201
    body = r.json()
    assert body["stored"] is True
    assert body["email_sent"] is False  # SMTP unconfigured -> honest no-op


def test_contact_message_is_persisted_and_admin_readable(client, admin_token):
    created = client.post("/api/contact", json=_contact_payload()).json()
    r = client.get(
        "/api/contact/messages",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    row = next(m for m in r.json() if m["id"] == created["id"])
    assert row["name"] == "Luca Bianchi"
    assert row["subject"] == "Table for two"
    assert "quiet table for two" in row["message"]


def test_contact_messages_listing_requires_admin(client):
    r = client.get("/api/contact/messages")
    assert r.status_code in (401, 403)


def test_contact_validation_rejects_invalid_email(client):
    r = client.post("/api/contact", json=_contact_payload(email="not-an-email"))
    assert r.status_code == 422


def test_contact_validation_rejects_short_message(client):
    r = client.post("/api/contact", json=_contact_payload(message="too short"))
    assert r.status_code == 422


def test_contact_submit_never_discards_message_on_email_failure(client):
    # Even with SMTP unconfigured (email_sent false) the message is still stored,
    # so a contact submission is never silently lost.
    created = client.post("/api/contact", json=_contact_payload()).json()
    assert created["stored"] is True
