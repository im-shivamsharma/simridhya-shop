from functools import wraps
from flask import request, jsonify
import jwt
from config import Config
from database import db
from bson import ObjectId

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check Authorization header
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                
        if not token:
            return jsonify({"message": "Authentication token is missing!"}), 401
            
        try:
            # Decode token
            data = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
            # Get User
            current_user = db.users.find_one({"_id": ObjectId(data["user_id"])})
            if not current_user:
                return jsonify({"message": "User session not found!"}), 401
                
            current_user["_id"] = str(current_user["_id"])
            current_user.pop("passwordHash", None) # Remove sensitive data
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired!"}), 401
        except Exception:
            return jsonify({"message": "Invalid authentication token!"}), 401
            
        return f(current_user, *args, **kwargs)
        
    return decorated

def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(current_user, *args, **kwargs):
        if not current_user.get("isAdmin", False):
            return jsonify({"message": "Admin privileges required for this caravan!"}), 403
        return f(current_user, *args, **kwargs)
    return decorated
