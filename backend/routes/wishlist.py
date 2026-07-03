from flask import Blueprint, request, jsonify
from database import db
from middleware.auth import token_required
from bson import ObjectId

wishlist_bp = Blueprint("wishlist", __name__)

def resolve_wishlist_products(product_ids):
    resolved = []
    for pid in product_ids:
        try:
            product = db.products.find_one({"_id": ObjectId(pid)})
            if product:
                product["_id"] = str(product["_id"])
                resolved.append(product)
        except Exception:
            pass
    return resolved

@wishlist_bp.route("/wishlist", methods=["GET"])
@token_required
def get_wishlist(current_user):
    user_id = current_user["_id"]
    wish_doc = db.wishlist.find_one({"userId": user_id})
    if not wish_doc:
        return jsonify([]), 200
        
    resolved = resolve_wishlist_products(wish_doc.get("productIds", []))
    return jsonify(resolved), 200

@wishlist_bp.route("/wishlist", methods=["POST"])
@token_required
def add_to_wishlist(current_user):
    user_id = current_user["_id"]
    data = request.get_json() or {}
    productId = data.get("productId")
    
    if not productId:
        return jsonify({"message": "Product ID is required!"}), 400
        
    wish_doc = db.wishlist.find_one({"userId": user_id})
    if not wish_doc:
        wish_doc = {"userId": user_id, "productIds": []}
        db.wishlist.insert_one(wish_doc)
        wish_doc = db.wishlist.find_one({"userId": user_id})
        
    productIds = wish_doc.get("productIds", [])
    if productId not in productIds:
        productIds.append(productId)
        db.wishlist.update_one({"userId": user_id}, {"$set": {"productIds": productIds}})
        
    resolved = resolve_wishlist_products(productIds)
    return jsonify(resolved), 200

@wishlist_bp.route("/wishlist", methods=["DELETE"])
@token_required
def remove_from_wishlist(current_user):
    user_id = current_user["_id"]
    data = request.get_json() or {}
    productId = data.get("productId")
    
    if not productId:
        return jsonify({"message": "Product ID is required!"}), 400
        
    wish_doc = db.wishlist.find_one({"userId": user_id})
    if not wish_doc:
        return jsonify({"message": "Wishlist not found!"}), 404
        
    productIds = wish_doc.get("productIds", [])
    if productId in productIds:
        productIds.remove(productId)
        db.wishlist.update_one({"userId": user_id}, {"$set": {"productIds": productIds}})
        
    resolved = resolve_wishlist_products(productIds)
    return jsonify(resolved), 200
