from flask import Blueprint, request, jsonify
from database import db
from middleware.auth import token_required, admin_required
from bson import ObjectId
import datetime

coupons_bp = Blueprint("coupons", __name__)

@coupons_bp.route("/coupon/apply", methods=["POST"])
@token_required
def apply_coupon(current_user):
    data = request.get_json() or {}
    code = data.get("code", "").strip().upper()
    
    if not code:
        return jsonify({"message": "Please enter a coupon code!"}), 400
        
    coupon = db.coupons.find_one({"code": code})
    if not coupon:
        return jsonify({"message": "Invalid coupon code!"}), 404
        
    if not coupon.get("active", True):
        return jsonify({"message": "This coupon code is inactive!"}), 400
        
    expiry = coupon.get("expiryDate")
    if expiry:
        if isinstance(expiry, str):
            try:
                expiry = datetime.datetime.fromisoformat(expiry.replace("Z", "+00:00"))
            except Exception:
                pass
        if isinstance(expiry, datetime.datetime) and expiry < datetime.datetime.utcnow():
            return jsonify({"message": "This coupon code has expired!"}), 400
            
    return jsonify({
        "message": "Coupon applied successfully!",
        "code": code,
        "discountPercentage": float(coupon.get("discountPercentage", 0))
    }), 200

# Admin CRUD APIs

@coupons_bp.route("/coupons", methods=["GET"])
@admin_required
def get_coupons(current_user):
    cursor = db.coupons.find().sort([("code", 1)])
    coupon_list = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("expiryDate"), datetime.datetime):
            doc["expiryDate"] = doc["expiryDate"].isoformat()
        coupon_list.append(doc)
    return jsonify(coupon_list), 200

@coupons_bp.route("/coupons", methods=["POST"])
@admin_required
def create_coupon(current_user):
    data = request.get_json() or {}
    code = data.get("code", "").strip().upper()
    discountPercentage = float(data.get("discountPercentage", 0))
    expiryDate = data.get("expiryDate")
    active = bool(data.get("active", True))
    
    if not code or discountPercentage <= 0:
        return jsonify({"message": "Coupon code and positive discount percentage are required!"}), 400
        
    if db.coupons.find_one({"code": code}):
        return jsonify({"message": "Coupon code already exists!"}), 400
        
    expiry_dt = None
    if expiryDate:
        try:
            expiry_dt = datetime.datetime.fromisoformat(expiryDate.replace("Z", "+00:00"))
        except Exception:
            pass
            
    new_coupon = {
        "code": code,
        "discountPercentage": discountPercentage,
        "expiryDate": expiry_dt,
        "active": active
    }
    
    result = db.coupons.insert_one(new_coupon)
    new_coupon["_id"] = str(result.inserted_id)
    if isinstance(new_coupon.get("expiryDate"), datetime.datetime):
        new_coupon["expiryDate"] = new_coupon["expiryDate"].isoformat()
        
    return jsonify(new_coupon), 201

@coupons_bp.route("/coupons/<coupon_id>", methods=["PATCH"])
@admin_required
def update_coupon(current_user, coupon_id):
    try:
        obj_id = ObjectId(coupon_id)
    except Exception:
        return jsonify({"message": "Invalid coupon ID!"}), 400
        
    data = request.get_json() or {}
    doc = db.coupons.find_one({"_id": obj_id})
    if not doc:
        return jsonify({"message": "Coupon not found!"}), 404
        
    update_data = {}
    if "code" in data:
        update_data["code"] = data["code"].strip().upper()
    if "discountPercentage" in data:
        update_data["discountPercentage"] = float(data["discountPercentage"])
    if "expiryDate" in data:
        expiryDate = data["expiryDate"]
        expiry_dt = None
        if expiryDate:
            try:
                expiry_dt = datetime.datetime.fromisoformat(expiryDate.replace("Z", "+00:00"))
            except Exception:
                pass
        update_data["expiryDate"] = expiry_dt
    if "active" in data:
        update_data["active"] = bool(data["active"])
        
    if not update_data:
        return jsonify({"message": "No data provided for update!"}), 400
        
    db.coupons.update_one({"_id": obj_id}, {"$set": update_data})
    
    updated_doc = db.coupons.find_one({"_id": obj_id})
    updated_doc["_id"] = str(updated_doc["_id"])
    if isinstance(updated_doc.get("expiryDate"), datetime.datetime):
        updated_doc["expiryDate"] = updated_doc["expiryDate"].isoformat()
        
    return jsonify(updated_doc), 200

@coupons_bp.route("/coupons/<coupon_id>", methods=["DELETE"])
@admin_required
def delete_coupon(current_user, coupon_id):
    try:
        obj_id = ObjectId(coupon_id)
    except Exception:
        return jsonify({"message": "Invalid coupon ID!"}), 400
        
    result = db.coupons.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        return jsonify({"message": "Coupon not found!"}), 404
        
    return jsonify({"message": "Coupon successfully deleted!"}), 200
