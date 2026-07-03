from flask import Blueprint, request, jsonify
from database import db
import datetime

forms_bp = Blueprint("forms", __name__)

@forms_bp.route("/contact", methods=["POST"])
def contact():
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    subject = data.get("subject")
    message = data.get("message")
    
    if not name or not email or not message:
        return jsonify({"message": "Name, email, and message are required!"}), 400
        
    inquiry = {
        "name": name,
        "email": email,
        "subject": subject,
        "message": message,
        "createdAt": datetime.datetime.utcnow()
    }
    
    db.contact.insert_one(inquiry)
    return jsonify({"message": "Shukriya! Your message has reached our Caravan."}), 201

@forms_bp.route("/newsletter", methods=["POST"])
def newsletter():
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    
    if not email:
        return jsonify({"message": "Email is required!"}), 400
        
    existing = db.newsletter.find_one({"email": email})
    if existing:
        return jsonify({"message": "You are already part of our Caravan newsletter!"}), 200
        
    subscription = {
        "email": email,
        "subscribedAt": datetime.datetime.utcnow()
    }
    db.newsletter.insert_one(subscription)
    
    return jsonify({
        "message": "Namaste! Welcome to our Caravan.",
        "couponCode": "CARAVAN10"
    }), 201
