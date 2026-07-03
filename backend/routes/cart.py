from flask import Blueprint, request, jsonify
from database import db
from middleware.auth import token_required
from bson import ObjectId

cart_bp = Blueprint("cart", __name__)

def resolve_cart_items(items):
    resolved = []
    for item in items:
        prod_id_str = item.get("productId")
        try:
            product = db.products.find_one({"_id": ObjectId(prod_id_str)})
            if product:
                resolved.append({
                    "id": prod_id_str,
                    "name": product["name"],
                    "price": product["price"],
                    "image": product["images"][0] if product.get("images") else "assets/prod_yellow_kurta.png",
                    "selectedSize": item["selectedSize"],
                    "selectedColor": item["selectedColor"],
                    "quantity": item["quantity"]
                })
        except Exception:
            pass
    return resolved

@cart_bp.route("/cart", methods=["GET"])
@token_required
def get_cart(current_user):
    user_id = current_user["_id"]
    cart_doc = db.cart.find_one({"userId": user_id})
    if not cart_doc:
        return jsonify([]), 200
        
    resolved = resolve_cart_items(cart_doc.get("items", []))
    return jsonify(resolved), 200

@cart_bp.route("/cart/add", methods=["POST"])
@token_required
def add_to_cart(current_user):
    user_id = current_user["_id"]
    data = request.get_json() or {}
    productId = data.get("productId")
    size = data.get("selectedSize")
    color = data.get("selectedColor")
    quantity = int(data.get("quantity", 1))
    
    if not productId or not size or not color:
        return jsonify({"message": "Product ID, size, and color are required!"}), 400
        
    cart_doc = db.cart.find_one({"userId": user_id})
    if not cart_doc:
        cart_doc = {"userId": user_id, "items": []}
        db.cart.insert_one(cart_doc)
        cart_doc = db.cart.find_one({"userId": user_id})
        
    items = cart_doc.get("items", [])
    
    exists = False
    for item in items:
        if item["productId"] == productId and item["selectedSize"] == size and item["selectedColor"] == color:
            item["quantity"] += quantity
            exists = True
            break
            
    if not exists:
        items.append({
            "productId": productId,
            "selectedSize": size,
            "selectedColor": color,
            "quantity": quantity
        })
        
    db.cart.update_one({"userId": user_id}, {"$set": {"items": items}})
    
    resolved = resolve_cart_items(items)
    return jsonify(resolved), 200

@cart_bp.route("/cart/update", methods=["PATCH"])
@token_required
def update_cart_qty(current_user):
    user_id = current_user["_id"]
    data = request.get_json() or {}
    productId = data.get("productId")
    size = data.get("selectedSize")
    color = data.get("selectedColor")
    quantity = int(data.get("quantity", 1))
    
    if not productId or not size or not color:
        return jsonify({"message": "Product ID, size, and color are required!"}), 400
        
    cart_doc = db.cart.find_one({"userId": user_id})
    if not cart_doc:
        return jsonify({"message": "Cart not found!"}), 404
        
    items = cart_doc.get("items", [])
    
    for item in items:
        if item["productId"] == productId and item["selectedSize"] == size and item["selectedColor"] == color:
            if quantity <= 0:
                items.remove(item)
            else:
                item["quantity"] = quantity
            break
            
    db.cart.update_one({"userId": user_id}, {"$set": {"items": items}})
    resolved = resolve_cart_items(items)
    return jsonify(resolved), 200

@cart_bp.route("/cart/remove", methods=["DELETE"])
@token_required
def remove_from_cart(current_user):
    user_id = current_user["_id"]
    data = request.get_json() or {}
    productId = data.get("productId")
    size = data.get("selectedSize")
    color = data.get("selectedColor")
    
    if not productId or not size or not color:
        return jsonify({"message": "Product ID, size, and color are required!"}), 400
        
    cart_doc = db.cart.find_one({"userId": user_id})
    if not cart_doc:
        return jsonify({"message": "Cart not found!"}), 404
        
    items = cart_doc.get("items", [])
    items = [item for item in items if not (item["productId"] == productId and item["selectedSize"] == size and item["selectedColor"] == color)]
    
    db.cart.update_one({"userId": user_id}, {"$set": {"items": items}})
    resolved = resolve_cart_items(items)
    return jsonify(resolved), 200
