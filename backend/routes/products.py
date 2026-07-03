from flask import Blueprint, request, jsonify
from database import db
from bson import ObjectId
from middleware.auth import admin_required
from utils.cloudinary_helper import upload_image

products_bp = Blueprint("products", __name__)

@products_bp.route("/products", methods=["GET"])
def get_products():
    category = request.args.get("category")
    query = {}
    if category and category != "all":
        query["category"] = category
        
    cursor = db.products.find(query)
    product_list = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        product_list.append(doc)
    return jsonify(product_list), 200

@products_bp.route("/products/<product_id>", methods=["GET"])
def get_product(product_id):
    try:
        doc = db.products.find_one({"_id": ObjectId(product_id)})
        if not doc:
            return jsonify({"message": "Product not found!"}), 404
        doc["_id"] = str(doc["_id"])
        return jsonify(doc), 200
    except Exception:
        return jsonify({"message": "Invalid product ID!"}), 400

@products_bp.route("/categories", methods=["GET"])
def get_categories():
    categories = db.products.distinct("category")
    return jsonify(categories), 200

@products_bp.route("/search", methods=["GET"])
def search_products():
    q = request.args.get("q", "")
    if not q:
        return jsonify([]), 200
        
    query = {
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}}
        ]
    }
    cursor = db.products.find(query)
    product_list = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        product_list.append(doc)
    return jsonify(product_list), 200

# Admin CRUD APIs

@products_bp.route("/products", methods=["POST"])
@admin_required
def create_product(current_user):
    if request.content_type and "multipart/form-data" in request.content_type:
        name = request.form.get("name")
        description = request.form.get("description")
        category = request.form.get("category")
        price = float(request.form.get("price", 0))
        originalPrice = float(request.form.get("originalPrice", 0))
        stock = int(request.form.get("stock", 0))
        badge = request.form.get("badge", "NEW")
        rating = float(request.form.get("rating", 4.5))
        reviews = int(request.form.get("reviews", 0))
        
        sizes = request.form.getlist("sizes") or ["S", "M", "L", "XL"]
        
        colors = []
        colors_raw = request.form.get("colors")
        if colors_raw:
            import json
            try:
                colors = json.loads(colors_raw)
            except Exception:
                pass
                
        # Image Upload
        images = []
        if "images" in request.files:
            file_list = request.files.getlist("images")
            for f in file_list:
                if f.filename != "":
                    img_url = upload_image(f)
                    images.append(img_url)
        
        # If no images uploaded, set a default
        if not images:
            images = ["assets/prod_yellow_kurta.png"]
    else:
        # JSON Body fallback
        data = request.get_json() or {}
        name = data.get("name")
        description = data.get("description")
        category = data.get("category")
        price = float(data.get("price", 0))
        originalPrice = float(data.get("originalPrice", 0))
        stock = int(data.get("stock", 0))
        badge = data.get("badge", "NEW")
        rating = float(data.get("rating", 4.5))
        reviews = int(data.get("reviews", 0))
        images = data.get("images", ["assets/prod_yellow_kurta.png"])
        sizes = data.get("sizes", ["S", "M", "L", "XL"])
        colors = data.get("colors", [])
        
    if not name or not category or not price:
        return jsonify({"message": "Missing required fields (name, category, price)!"}), 400
        
    new_prod = {
        "name": name,
        "description": description,
        "category": category,
        "price": price,
        "originalPrice": originalPrice,
        "stock": stock,
        "rating": rating,
        "reviews": reviews,
        "badge": badge,
        "images": images,
        "sizes": sizes,
        "colors": colors
    }
    
    result = db.products.insert_one(new_prod)
    new_prod["_id"] = str(result.inserted_id)
    return jsonify(new_prod), 201

@products_bp.route("/products/<product_id>", methods=["PATCH"])
@admin_required
def update_product(current_user, product_id):
    try:
        obj_id = ObjectId(product_id)
    except Exception:
        return jsonify({"message": "Invalid product ID!"}), 400
        
    doc = db.products.find_one({"_id": obj_id})
    if not doc:
        return jsonify({"message": "Product not found!"}), 404
        
    if request.content_type and "multipart/form-data" in request.content_type:
        update_data = {}
        for key in ["name", "description", "category", "badge"]:
            val = request.form.get(key)
            if val is not None:
                update_data[key] = val
        for key in ["price", "originalPrice", "rating"]:
            val = request.form.get(key)
            if val is not None:
                update_data[key] = float(val)
        for key in ["stock", "reviews"]:
            val = request.form.get(key)
            if val is not None:
                update_data[key] = int(val)
                
        sizes = request.form.getlist("sizes")
        if sizes:
            update_data["sizes"] = sizes
            
        colors_raw = request.form.get("colors")
        if colors_raw:
            import json
            try:
                update_data["colors"] = json.loads(colors_raw)
            except Exception:
                pass
                
        # Image Upload
        if "images" in request.files:
            file_list = request.files.getlist("images")
            new_images = []
            for f in file_list:
                if f.filename != "":
                    img_url = upload_image(f)
                    new_images.append(img_url)
            if new_images:
                update_data["images"] = new_images
    else:
        # JSON body
        data = request.get_json() or {}
        update_data = {}
        for key in ["name", "description", "category", "badge"]:
            if key in data:
                update_data[key] = data[key]
        for key in ["price", "originalPrice", "rating"]:
            if key in data:
                update_data[key] = float(data[key])
        for key in ["stock", "reviews"]:
            if key in data:
                update_data[key] = int(data[key])
        for key in ["images", "sizes", "colors"]:
            if key in data:
                update_data[key] = data[key]
                
    if not update_data:
        return jsonify({"message": "No data provided for update!"}), 400
        
    db.products.update_one({"_id": obj_id}, {"$set": update_data})
    
    updated_doc = db.products.find_one({"_id": obj_id})
    updated_doc["_id"] = str(updated_doc["_id"])
    return jsonify(updated_doc), 200

@products_bp.route("/products/<product_id>", methods=["DELETE"])
@admin_required
def delete_product(current_user, product_id):
    try:
        obj_id = ObjectId(product_id)
    except Exception:
        return jsonify({"message": "Invalid product ID!"}), 400
        
    result = db.products.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        return jsonify({"message": "Product not found!"}), 404
        
    return jsonify({"message": "Product successfully deleted!"}), 200
