import urllib.request
import urllib.error
import json
import logging
from config import Config

logger = logging.getLogger(__name__)

def get_otp_html(otp):
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Verify your Simrdhya Account</title>
        <style>
            body {{
                font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
                background-color: #FDFBF7;
                color: #121212;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #FFFFFF;
                border: 2px solid #FF1493;
                box-shadow: 4px 4px 0px #FFD700;
                padding: 2.5rem;
                margin-top: 2rem;
            }}
            .header {{
                text-align: center;
                border-bottom: 2px dashed rgba(18, 18, 18, 0.1);
                padding-bottom: 1.5rem;
                margin-bottom: 2rem;
            }}
            .logo {{
                font-family: 'Playfair Display', serif;
                font-size: 2.2rem;
                font-weight: 900;
                letter-spacing: 0.1em;
                color: #121212;
                text-decoration: none;
            }}
            .motif {{
                color: #FF1493;
                font-size: 1.1rem;
                font-weight: 700;
                margin-top: 0.5rem;
            }}
            .otp-box {{
                font-size: 2.5rem;
                font-weight: 800;
                letter-spacing: 0.25em;
                color: #FF1493;
                background-color: #FDFBF7;
                border: 2px solid #121212;
                padding: 1.5rem;
                text-align: center;
                margin: 2rem 0;
                box-shadow: 3px 3px 0px #00D2C4;
            }}
            .expiry-notice {{
                font-weight: 700;
                color: #E03E3E;
            }}
            .footer {{
                margin-top: 3rem;
                border-top: 1px solid rgba(18, 18, 18, 0.05);
                padding-top: 1.5rem;
                font-size: 0.85rem;
                color: #7A7A7A;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">SIMRDHYA</div>
                <div class="motif">🌸 MADE TO SLAY • STYLED TO STAY 🌸</div>
            </div>
            
            <p>Namaste,</p>
            <p>Thank you for signing up with <strong>Simrdhya</strong>! To complete your registration and load your fashion Caravan, please verify your email using the secure 6-digit verification code below:</p>
            
            <div class="otp-box">{otp}</div>
            
            <p class="expiry-notice">⚠️ This verification code is valid for 5 minutes only.</p>
            <p>If you did not request this code, please ignore this email; your account details will remain secure.</p>
            
            <div class="footer">
                <p>&copy; 2026 Simrdhya Official. All rights reserved.</p>
                <p>Premium Indian Truck-Art Inspired Fashion Caravan.</p>
            </div>
        </div>
    </body>
    </html>
    """

def send_verification_email(to_email, otp):
    api_key = Config.RESEND_API_KEY
    if not api_key or not api_key.strip() or not api_key.startswith("re_"):
        logger.warning("RESEND_API_KEY is not set or placeholder. OTP code is: %s", otp)
        # In development/test if API key is not configured, we print code to console to bypass blocking
        print(f"\n[DEV MODE] OTP verification code for {to_email} is: {otp}\n")
        return {"id": "mock_id"}

    from_email = Config.RESEND_FROM_EMAIL
    subject = "Verify your Simrdhya Account"
    html_content = get_otp_html(otp)
    
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "SimrdhyaApp/1.0"
    }
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        logger.error("Resend API response error: %s", error_body)
        try:
            err_json = json.loads(error_body)
            err_msg = err_json.get("message") or err_json.get("error", {}).get("message") or f"error code: {e.code}"
        except Exception:
            err_msg = f"status code: {e.code}"
        raise Exception(f"Email delivery failed: {err_msg}")
    except Exception as e:
        logger.error("Resend connection error: %s", str(e))
        raise Exception("Failed to connect to email provider.")
