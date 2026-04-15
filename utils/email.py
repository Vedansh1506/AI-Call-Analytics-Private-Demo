from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from utils.config import settings
from utils.logger import get_logger

logger = get_logger(__name__)


async def send_email(to: str, subject: str, html_body: str) -> bool:
    """Send an email. Returns True on success, False on failure."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"]      = to
        msg.attach(MIMEText(html_body, "html"))

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        logger.info(f"Email sent to {to} | subject: {subject}")
        return True

    except Exception as e:
        logger.error(f"Email failed to {to} | {e}")
        return False


def _otp_html(otp: str, purpose: str, expiry_minutes: int = 10) -> str:
    """Reusable HTML template for OTP emails."""
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
      <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #6366f1, #ec4899);
                      border-radius: 12px; padding: 12px 20px;">
            <span style="color: white; font-size: 20px; font-weight: 700;">CallAI</span>
          </div>
        </div>
        <h2 style="color: #111827; margin: 0 0 8px;">{purpose}</h2>
        <p style="color: #6b7280; margin: 0 0 24px;">Use the code below. It expires in {expiry_minutes} minutes.</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #6366f1;">{otp}</span>
        </div>
        <p style="color: #9ca3af; font-size: 13px; margin: 0;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>
    """


async def send_otp_email(to: str, otp: str, purpose: str, expiry_minutes: int = 10) -> bool:
    subject_map = {
        "verify_email":     "Verify your CallAI account",
        "forgot_password":  "Reset your CallAI password",
        "change_password":  "Confirm password change on CallAI",
    }
    purpose_label_map = {
        "verify_email":     "Verify your email",
        "forgot_password":  "Reset your password",
        "change_password":  "Confirm password change",
    }
    subject = subject_map.get(purpose, "Your CallAI OTP")
    label   = purpose_label_map.get(purpose, "Your OTP")
    html    = _otp_html(otp, label, expiry_minutes)
    return await send_email(to, subject, html)