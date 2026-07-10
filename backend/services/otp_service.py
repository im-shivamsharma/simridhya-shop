import secrets
import bcrypt
import datetime
from database import db

def generate_secure_otp():
    # Generate cryptographically secure 6-digit number
    return str(secrets.randbelow(900000) + 100000)

def hash_otp(otp):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(otp.encode("utf-8"), salt)

def verify_otp_hash(plain_otp, hashed_otp):
    try:
        # Hashed value in DB is stored as bytes, but might be fetched as str or binary in Mongo
        if isinstance(hashed_otp, str):
            hashed_otp = hashed_otp.encode("utf-8")
        return bcrypt.checkpw(plain_otp.encode("utf-8"), hashed_otp)
    except Exception:
        return False
