import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config

# Determine frontend static directory relative to this app.py
base_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.join(os.path.dirname(base_dir), "frontend")

app = Flask(__name__, static_folder=frontend_dir, static_url_path="")
CORS(app)

# Load configuration
app.config.from_object(Config)

# Register Blueprints
from routes.auth import auth_bp
from routes.products import products_bp
from routes.cart import cart_bp
from routes.wishlist import wishlist_bp
from routes.orders import orders_bp
from routes.coupons import coupons_bp
from routes.forms import forms_bp

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(products_bp, url_prefix="/api")
app.register_blueprint(cart_bp, url_prefix="/api")
app.register_blueprint(wishlist_bp, url_prefix="/api")
app.register_blueprint(orders_bp, url_prefix="/api")
app.register_blueprint(coupons_bp, url_prefix="/api")
app.register_blueprint(forms_bp, url_prefix="/api")

# Serve Index Page
@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

# Serve Admin Page
@app.route("/admin")
def serve_admin():
    return send_from_directory(app.static_folder, "admin.html")

# Serve other static files
@app.route("/<path:path>")
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
