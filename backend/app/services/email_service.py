"""Best-effort transactional email service (stdlib smtplib).

All SMTP configuration comes from the environment (see Settings). When SMTP is
not configured, the service is a no-op: callers always get back an explicit
``success`` boolean plus a ``reason`` so they can report delivery honestly
instead of pretending an email was sent.

Email sending is deliberately best-effort and never raises: a failure to reach
the mail server must not roll back a reservation or fail a contact submission.
"""

from __future__ import annotations

import logging
import smtplib
from dataclasses import dataclass
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Optional, Sequence

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass
class EmailResult:
    success: bool
    reason: str = ""


def _smtp_from(settings: Settings) -> str:
    return formataddr((settings.smtp_from_name, settings.smtp_from))


def _recipients(settings: Settings, restaurant_email: Optional[str]) -> list[str]:
    """Owner/notification recipients: configured list, falling back to the
    seeded restaurant email when the list is empty (and one is available)."""
    recipients = settings.notification_recipient_list
    if not recipients and restaurant_email:
        recipients = [restaurant_email]
    return recipients


def send_email(
    *,
    to: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    settings: Optional[Settings] = None,
) -> EmailResult:
    """Send a single email.

    Returns an ``EmailResult``; never raises. When SMTP is not configured the
    result has ``success=False`` and ``reason`` describing the skip.
    """
    settings = settings or get_settings()
    if not settings.email_enabled:
        logger.info("SMTP not configured; skipping email to %s (subject=%r)", to, subject)
        return EmailResult(False, "smtp_not_configured")

    msg = MIMEMultipart("alternative")
    msg["From"] = _smtp_from(settings)
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(body_text, "plain", "utf-8"))
    if body_html:
        msg.attach(MIMEText(body_html, "html", "utf-8"))

    try:
        if settings.smtp_use_tls:
            server = smtplib.SMTP_SSL(
                settings.smtp_host, settings.smtp_port, timeout=15
            )
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15)
            if settings.smtp_starttls:
                server.starttls()
        with server:
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.smtp_from, [to], msg.as_string())
        logger.info("Email sent to %s (subject=%r)", to, subject)
        return EmailResult(True)
    except Exception as exc:  # noqa: BLE001 - best-effort by design
        logger.warning("Failed to send email to %s: %s", to, exc)
        return EmailResult(False, "send_failed")


def send_reservation_confirmation_email(
    *,
    to: str,
    reference_code: str,
    first_name: str,
    reservation_date: str,
    reservation_time: str,
    guests: int,
    restaurant_name: str,
    settings: Optional[Settings] = None,
) -> EmailResult:
    settings = settings or get_settings()
    subject = f"Your reservation {reference_code} at {restaurant_name}"
    body = (
        f"Dear {first_name},\n\n"
        f"Thank you for your reservation at {restaurant_name}.\n\n"
        f"Reference: {reference_code}\n"
        f"Date: {reservation_date}\n"
        f"Time: {reservation_time}\n"
        f"Guests: {guests}\n\n"
        f"Please keep your reference code to manage or cancel this reservation.\n\n"
        f"We look forward to welcoming you.\n{restaurant_name}"
    )
    return send_email(
        to=to, subject=subject, body_text=body, settings=settings
    )


def send_owner_reservation_notification(
    *,
    first_name: str,
    last_name: str,
    guest_email: str,
    reference_code: str,
    reservation_date: str,
    reservation_time: str,
    guests: int,
    restaurant_email: Optional[str],
    settings: Optional[Settings] = None,
) -> EmailResult:
    settings = settings or get_settings()
    recipients = _recipients(settings, restaurant_email)
    if not recipients:
        return EmailResult(False, "no_recipients")

    subject = f"New reservation {reference_code}"
    body = (
        f"A new reservation has been made.\n\n"
        f"Guest: {first_name} {last_name}\n"
        f"Email: {guest_email}\n"
        f"Reference: {reference_code}\n"
        f"Date: {reservation_date}\n"
        f"Time: {reservation_time}\n"
        f"Guests: {guests}\n"
    )
    return send_email(
        to=recipients[0], subject=subject, body_text=body, settings=settings
    )


def send_contact_notification(
    *,
    name: str,
    email: str,
    subject: str,
    message: str,
    restaurant_email: Optional[str],
    settings: Optional[Settings] = None,
) -> EmailResult:
    settings = settings or get_settings()
    recipients = _recipients(settings, restaurant_email)
    if not recipients:
        return EmailResult(False, "no_recipients")

    email_subject = f"New contact message: {subject}"
    body = (
        f"A new contact message was submitted.\n\n"
        f"Name: {name}\n"
        f"Email: {email}\n"
        f"Subject: {subject}\n\n"
        f"Message:\n{message}\n"
    )
    return send_email(
        to=recipients[0], subject=email_subject, body_text=body, settings=settings
    )


def send_all(emails: Sequence[EmailResult]) -> bool:
    """True when every email in the sequence was delivered."""
    return bool(emails) and all(e.success for e in emails)
