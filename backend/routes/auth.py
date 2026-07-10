from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import datetime
from config import Config
from database import db
from middleware.auth import token_required
from services.otp_service import generate_secure_otp, hash_otp, verify_otp_hash
from services.email_service import send_verification_email

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/signup", methods=["POST"])
@auth_bp.route("/register", methods=["POST"])
def signup():
    import logging
    import re
    
    data = request.get_json() or {}
    logging.getLogger(__name__).info("Incoming signup request body: %s", data)
    
    fullName = data.get("fullName")
    email = data.get("email")
    password = data.get("password")
    phone = data.get("phone", "")
    
    # Granular request validation
    if not fullName or not fullName.strip():
        return jsonify({"message": "Please provide your full name."}), 400
    if not email or not email.strip():
        return jsonify({"message": "Please provide an email address."}), 400
    if not password:
        return jsonify({"message": "Please provide a password."}), 400
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"message": "Invalid email address format."}), 400
    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters long."}), 400
        
    # Check if user already exists
    if db.users.find_one({"email": email}):
        return jsonify({"message": "Email is already registered!"}), 400
        
    # Hash password immediately
    salt = bcrypt.gensalt()
    passwordHash = bcrypt.hashpw(password.encode("utf-8"), salt)
    
    # Generate OTP and hash it
    otp = generate_secure_otp()
    hashed = hash_otp(otp)
    
    now = datetime.datetime.utcnow()
    expires = now + datetime.timedelta(minutes=5)
    
    # Store registration session data inside OTP verification document
    otp_doc = {
        "email": email,
        "otp_hash": hashed,
        "expiresAt": expires,
        "attempts": 0,
        "resendCount": 0,
        "createdAt": now,
        "registration_data": {
            "fullName": fullName,
            "email": email,
            "passwordHash": passwordHash,
            "phone": phone
        }
    }
    
    try:
        # Send verification email via Resend
        send_verification_email(email, otp)
        
        # Save verification session to MongoDB (upsert in case they restart sign up)
        db.otp_verifications.update_one(
            {"email": email},
            {"$set": otp_doc},
            upsert=True
        )
        
        return jsonify({
            "message": "OTP Sent",
            "email": email
        }), 200
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("Email dispatch failed during signup")
        return jsonify({"message": f"Verification email delivery failed: {str(e)}"}), 400

@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json() or {}
    email = data.get("email")
    otp = data.get("otp")
    
    if not email or not otp:
        return jsonify({"message": "Email and verification code are required!"}), 400
        
    otp_doc = db.otp_verifications.find_one({"email": email})
    if not otp_doc:
        return jsonify({"message": "Verification session expired or not found."}), 400
        
    now = datetime.datetime.utcnow()
    
    # Check if expired
    if otp_doc["expiresAt"] < now:
        db.otp_verifications.delete_one({"email": email})
        return jsonify({"message": "OTP expired. Please request a new one."}), 400
        
    # Check failed attempts limit
    if otp_doc.get("attempts", 0) >= 5:
        db.otp_verifications.delete_one({"email": email})
        return jsonify({"message": "Too many failed attempts. Verification session cleared."}), 400
        
    # Verify hashed OTP
    if not verify_otp_hash(otp, otp_doc["otp_hash"]):
        # Increment failed attempts
        db.otp_verifications.update_one(
            {"email": email},
            {"$inc": {"attempts": 1}}
        )
        return jsonify({"message": "Invalid verification code."}), 400
        
    # Retrieve temporary signup details
    reg_data = otp_doc["registration_data"]
    
    # Create final user record
    new_user = {
        "fullName": reg_data["fullName"],
        "email": reg_data["email"],
        "passwordHash": reg_data["passwordHash"],
        "phone": reg_data.get("phone", ""),
        "isAdmin": False,
        "createdAt": datetime.datetime.utcnow()
    }
    
    # Insert User
    result = db.users.insert_one(new_user)
    user_id = str(result.inserted_id)
    
    # Delete OTP session document immediately
    db.otp_verifications.delete_one({"email": email})
    
    # Generate JWT Token
    token = jwt.encode({
        "user_id": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, Config.JWT_SECRET, algorithm="HS256")
    
    return jsonify({
        "message": "Email verified and registered successfully!",
        "token": token,
        "user": {
            "id": user_id,
            "fullName": reg_data["fullName"],
            "email": reg_data["email"],
            "phone": reg_data.get("phone", ""),
            "isAdmin": False
        }
    }), 201

@auth_bp.route("/resend-otp", methods=["POST"])
@auth_bp.route("/send-otp", methods=["POST"])
def resend_otp():
    data = request.get_json() or {}
    email = data.get("email")
    
    if not email:
        return jsonify({"message": "Email is required!"}), 400
        
    otp_doc = db.otp_verifications.find_one({"email": email})
    if not otp_doc:
        return jsonify({"message": "No active registration session found."}), 400
        
    now = datetime.datetime.utcnow()
    
    # Wait at least 60 seconds before allowing resend
    last_sent = otp_doc.get("lastResentAt") or otp_doc["createdAt"]
    if (now - last_sent).total_seconds() < 60:
        wait_sec = 60 - int((now - last_sent).total_seconds())
        return jsonify({"message": f"Please wait {wait_sec} seconds before requesting another code."}), 400
        
    # Maximum 3 resend attempts within 15 minutes (or 3 resends total per session)
    if otp_doc.get("resendCount", 0) >= 3:
        return jsonify({"message": "Maximum resend limit reached. Please register again."}), 400
        
    # Generate new OTP code
    otp = generate_secure_otp()
    hashed = hash_otp(otp)
    
    try:
        # Dispatch new verification email
        send_verification_email(email, otp)
        
        # Replace old OTP details, reset attempts, increment resendCount, and extend expiry
        db.otp_verifications.update_one(
            {"email": email},
            {"$set": {
                "otp_hash": hashed,
                "expiresAt": now + datetime.timedelta(minutes=5),
                "lastResentAt": now,
                "attempts": 0,
                "resendCount": otp_doc.get("resendCount", 0) + 1
            }}
        )
        
        return jsonify({"message": "Verification code resent successfully!"}), 200
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("Email dispatch failed during OTP resend")
        return jsonify({"message": f"Verification email delivery failed: {str(e)}"}), 400

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"message": "Email and password are required!"}), 400
        
    user = db.users.find_one({"email": email})
    if not user:
        # Check if they completed registration or if it is pending verification
        if db.otp_verifications.find_one({"email": email}):
            return jsonify({"message": "Please verify your email."}), 403
        return jsonify({"message": "Invalid email or password!"}), 401
        
    # Verify password hash
    if not bcrypt.checkpw(password.encode("utf-8"), user["passwordHash"]):
        return jsonify({"message": "Invalid email or password!"}), 401
        
    # Generate Token
    token = jwt.encode({
        "user_id": str(user["_id"]),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, Config.JWT_SECRET, algorithm="HS256")
    
    return jsonify({
        "message": "Logged in successfully!",
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "fullName": user["fullName"],
            "email": user["email"],
            "phone": user.get("phone", ""),
            "isAdmin": user.get("isAdmin", False)
        }
    }), 200

@auth_bp.route("/profile", methods=["GET"])
@token_required
def get_profile(current_user):
    return jsonify({
        "user": {
            "id": str(current_user["_id"]),
            "fullName": current_user["fullName"],
            "email": current_user["email"],
            "phone": current_user.get("phone", ""),
            "isAdmin": current_user.get("isAdmin", False)
        }
    }), 200
