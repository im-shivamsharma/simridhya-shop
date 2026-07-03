from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import datetime
from config import Config
from database import db
from middleware.auth import token_required

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    fullName = data.get("fullName")
    email = data.get("email")
    password = data.get("password")
    phone = data.get("phone", "")
    
    if not fullName or not email or not password:
        return jsonify({"message": "Please provide full name, email, and password."}), 400
        
    # Check if user already exists
    if db.users.find_one({"email": email}):
        return jsonify({"message": "Email is already registered!"}), 400
        
    # Hash password
    salt = bcrypt.gensalt()
    passwordHash = bcrypt.hashpw(password.encode("utf-8"), salt)
    
    # Create User
    new_user = {
        "fullName": fullName,
        "email": email,
        "passwordHash": passwordHash,
        "phone": phone,
        "isAdmin": False,  # False by default
        "createdAt": datetime.datetime.utcnow()
    }
    
    # Insert User
    result = db.users.insert_one(new_user)
    
    # Generate Token
    token = jwt.encode({
        "user_id": str(result.inserted_id),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, Config.JWT_SECRET, algorithm="HS256")
    
    return jsonify({
        "message": "User registered successfully!",
        "token": token,
        "user": {
            "id": str(result.inserted_id),
            "fullName": fullName,
            "email": email,
            "phone": phone,
            "isAdmin": False
        }
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"message": "Email and password are required!"}), 400
        
    user = db.users.find_one({"email": email})
    if not user:
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
            "id": current_user["_id"],
            "fullName": current_user["fullName"],
            "email": current_user["email"],
            "phone": current_user.get("phone", ""),
            "isAdmin": current_user.get("isAdmin", False)
        }
    }), 200
