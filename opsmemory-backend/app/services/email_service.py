"""
OpsMemory — Email Service

SMTP email sending with HTML templates.
send_ceo_digest: daily 7am Lagos digest
send_deal_escalation_email: immediate CEO alert for high-value deals
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from app.config import settings
from app.database import supabase
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str, attachment_bytes: bytes = None, attachment_name: str = None) -> bool:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))
    if attachment_bytes and attachment_name:
        attachment = MIMEBase("application", "pdf")
        attachment.set_payload(attachment_bytes)
        encoders.encode_base64(attachment)
        attachment.add_header("Content-Disposition", f"attachment; filename={attachment_name}")
        msg.attach(attachment)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.smtp_from_email, to_email, msg.as_string())
        return True
    except Exception as e:
        logger.error(f"SMTP error: {e}")
        return False


async def send_ceo_digest(business_id: str) -> bool:
    business = supabase.table("businesses").select("*, business_users(*)").eq("id", business_id).single().execute().data
    if not business:
        return False
    ceo_email = business.get("owner_email")
    ceo_user = next((u for u in business.get("business_users", []) if u["role"] == "ceo"), None)
    if ceo_user:
        ceo_email = ceo_user.get("email", ceo_email)

    customers = supabase.table("customers").select("*").eq("business_id", business_id).execute().data
    pending_approvals = supabase.table("agent_actions").select("*").eq("business_id", business_id).eq("status", "pending").execute().data
    total_outstanding = sum(c.get("outstanding_balance", 0) for c in customers)
    high_risk = [c for c in customers if c.get("churn_risk") in ["high", "critical"]]
    health_scores = [c.get("health_score", 80) for c in customers]
    avg_health = round(sum(health_scores) / len(health_scores)) if health_scores else 0

    html_body = f"""<!DOCTYPE html><html><head><style>
body {{ font-family: Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto; }}
.header {{ background: #0B1020; color: #10B981; padding: 24px; text-align: center; }}
.metric {{ background: #F9FAFB; border-left: 4px solid #10B981; padding: 12px 16px; margin: 8px 0; }}
.metric.warning {{ border-color: #F59E0B; }} .metric.critical {{ border-color: #EF4444; }}
.metric-value {{ font-size: 24px; font-weight: bold; color: #111827; }}
.metric-label {{ font-size: 12px; color: #6B7280; }}
</style></head><body>
<div class="header"><h2 style="margin:0">OpsMemory</h2>
<p style="margin:4px 0; color:#94A3B8; font-size:13px">{business['name']} — Daily Digest</p>
<p style="margin:4px 0; color:#94A3B8; font-size:12px">{datetime.now().strftime('%A, %B %d, %Y')}</p></div>
<div style="padding: 24px">
<h3>Good morning. Here is your business as of 7am.</h3>
<div class="metric"><div class="metric-value">{avg_health}/100</div><div class="metric-label">Operational Health Score</div></div>
<div class="metric {'critical' if total_outstanding > 500000 else 'warning' if total_outstanding > 0 else ''}"><div class="metric-value">₦{total_outstanding:,.0f}</div><div class="metric-label">Total Outstanding Payments</div></div>
<div class="metric {'warning' if pending_approvals else ''}"><div class="metric-value">{len(pending_approvals)}</div><div class="metric-label">Actions Awaiting Your Approval</div></div>
{'<div class="metric critical"><div class="metric-value">' + str(len(high_risk)) + '</div><div class="metric-label">Customers at High Churn Risk</div></div>' if high_risk else ''}
<div style="text-align:center; margin-top:24px"><a href="{settings.base_url}/dashboard/approvals" style="background:#10B981; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:bold">Open Dashboard</a></div>
</div></body></html>"""
    return send_email(to_email=ceo_email, subject=f"OpsMemory Digest — {datetime.now().strftime('%b %d')} | Health: {avg_health}/100 | ₦{total_outstanding:,.0f} outstanding", html_body=html_body)


async def send_deal_escalation_email(business_id: str, agent_action: dict, customer: dict) -> bool:
    business = supabase.table("businesses").select("*").eq("id", business_id).single().execute().data
    ceo_email = business.get("owner_email", "")
    html_body = f"""<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto; padding: 24px;">
<h2 style="color: #D97706">🔔 Deal Requires Your Approval</h2>
<p><b>Business:</b> {business['name']}</p><p><b>Customer:</b> {customer.get('name')} ({customer.get('business_name', '')})</p>
<p><b>Lifetime value:</b> ₦{customer.get('total_revenue', 0):,.0f}</p><hr style="border-color:#E5E7EB"/>
<h3>Deal Intelligence Agent Briefing</h3>
<p style="background:#FFFBEB; padding:16px; border-left:4px solid #D97706">{agent_action['proposed_action']}</p>
<div style="text-align:center; margin-top:24px"><a href="{settings.base_url}/dashboard/approvals" style="background:#10B981; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:bold">Review & Approve</a></div>
</body></html>"""
    return send_email(to_email=ceo_email, subject=f"Deal Alert: {customer.get('name')} — Requires CEO Approval", html_body=html_body)
