from flask import Blueprint, request, jsonify
from database import db
from middleware.auth import token_required, admin_required
from bson import ObjectId
import datetime

orders_bp = Blueprint("orders", __name__)

@orders_bp.route("/checkout", methods=["POST"])
@token_required
def checkout(current_user):
    user_id = current_user["_id"]
    data = request.get_json() or {}
    items = data.get("products", [])
    subtotal = float(data.get("subtotal", 0))
    discount = float(data.get("discount", 0))
    total = float(data.get("total", 0))
    shippingAddress = data.get("shippingAddress", {})
    paymentMethod = data.get("paymentMethod", "cod")
    
    if not items:
        return jsonify({"message": "Cannot place order with empty items!"}), 400
        
    # Verify stock and decrement
    for item in items:
        prod_id = item.get("id") or item.get("productId")
        qty = int(item.get("quantity", 1))
        
        product = db.products.find_one({"_id": ObjectId(prod_id)})
        if not product:
            return jsonify({"message": f"Product {item.get('name', 'Unknown')} not found!"}), 400
            
        current_stock = int(product.get("stock", 0))
        if current_stock < qty:
            return jsonify({"message": f"Insufficient stock for {product['name']}! Available: {current_stock}"}), 400
            
        # Decrement stock
        db.products.update_one({"_id": ObjectId(prod_id)}, {"$inc": {"stock": -qty}})
        
    # Create Order
    new_order = {
        "userId": user_id,
        "products": items,
        "subtotal": subtotal,
        "discount": discount,
        "total": total,
        "paymentMethod": paymentMethod,
        "paymentStatus": "Paid" if paymentMethod in ["upi", "card"] else "Pending",
        "orderStatus": "Processing",
        "shippingAddress": shippingAddress,
        "createdAt": datetime.datetime.utcnow()
    }
    
    order_result = db.orders.insert_one(new_order)
    
    # Clear cart in database
    db.cart.update_one({"userId": user_id}, {"$set": {"items": []}})
    
    new_order["_id"] = str(order_result.inserted_id)
    return jsonify({
        "message": "Order placed successfully!",
        "order": new_order
    }), 201

@orders_bp.route("/orders", methods=["GET"])
@token_required
def get_orders(current_user):
    user_id = current_user["_id"]
    
    # If user is admin, return ALL orders. Else, return user's orders.
    if current_user.get("isAdmin", False):
        cursor = db.orders.find().sort([("createdAt", -1)])
    else:
        cursor = db.orders.find({"userId": user_id}).sort([("createdAt", -1)])
        
    order_list = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        # Fetch buyer details for admin dashboard visualization
        if current_user.get("isAdmin", False):
            buyer = db.users.find_one({"_id": ObjectId(doc["userId"])})
            if buyer:
                doc["userEmail"] = buyer.get("email")
                doc["buyerName"] = buyer.get("fullName")
        order_list.append(doc)
        
    return jsonify(order_list), 200

@orders_bp.route("/orders/<order_id>", methods=["GET"])
@token_required
def get_order(current_user, order_id):
    try:
        doc = db.orders.find_one({"_id": ObjectId(order_id)})
        if not doc:
            return jsonify({"message": "Order not found!"}), 404
            
        # Verify ownership (unless admin)
        if doc["userId"] != current_user["_id"] and not current_user.get("isAdmin", False):
            return jsonify({"message": "Unauthorized access!"}), 403
            
        doc["_id"] = str(doc["_id"])
        return jsonify(doc), 200
    except Exception:
        return jsonify({"message": "Invalid order ID!"}), 400

@orders_bp.route("/orders/<order_id>/status", methods=["PATCH"])
@admin_required
def update_order_status(current_user, order_id):
    data = request.get_json() or {}
    orderStatus = data.get("orderStatus")
    paymentStatus = data.get("paymentStatus")
    
    try:
        obj_id = ObjectId(order_id)
    except Exception:
        return jsonify({"message": "Invalid order ID!"}), 400
        
    doc = db.orders.find_one({"_id": obj_id})
    if not doc:
        return jsonify({"message": "Order not found!"}), 404
        
    update_data = {}
    if orderStatus:
        update_data["orderStatus"] = orderStatus
    if paymentStatus:
        update_data["paymentStatus"] = paymentStatus
        
    if not update_data:
        return jsonify({"message": "No update fields provided!"}), 400
        
    db.orders.update_one({"_id": obj_id}, {"$set": update_data})
    
    updated_doc = db.orders.find_one({"_id": obj_id})
    updated_doc["_id"] = str(updated_doc["_id"])
    return jsonify(updated_doc), 200
