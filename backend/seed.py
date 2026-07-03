import bcrypt
import datetime
from database import db

def seed_db():
    print("Starting database seeding...")
    
    # 1. Clear existing collections
    db.products.delete_many({})
    db.coupons.delete_many({})
    db.users.delete_many({"email": "admin@simrdhya.com"})
    
    # 2. Seed Default Admin User
    salt = bcrypt.gensalt()
    admin_pw_hash = bcrypt.hashpw("adminpassword123".encode("utf-8"), salt)
    admin_user = {
        "fullName": "Admin Caravan",
        "email": "admin@simrdhya.com",
        "passwordHash": admin_pw_hash,
        "phone": "+91 99999 88888",
        "isAdmin": True,
        "createdAt": datetime.datetime.utcnow()
    }
    db.users.insert_one(admin_user)
    print("Admin user seeded: admin@simrdhya.com / adminpassword123")
    
    # 3. Seed Coupons
    coupon = {
        "code": "CARAVAN10",
        "discountPercentage": 0.10,
        "expiryDate": datetime.datetime.utcnow() + datetime.timedelta(days=365),
        "active": True
    }
    db.coupons.insert_one(coupon)
    print("Promo code seeded: CARAVAN10 (10% off)")
    
    # 4. Seed Products
    initial_products = [
        {
            "name": "Rangoli Mustard A-Line Kurta",
            "description": "Embrace everyday ethnic luxury with this bright mustard yellow A-line kurta. Crafted from premium handcrafted cotton with delicate gold thread work on the cuffs and collar, inspired by traditional highway truck-art floral designs. Styled for comfort and built to make heads turn.",
            "category": "kurtas",
            "price": 2499.0,
            "originalPrice": 3499.0,
            "stock": 15,
            "rating": 4.8,
            "reviews": 48,
            "badge": "BESTSELLER",
            "images": ["assets/prod_yellow_kurta.png"],
            "sizes": ["S", "M", "L", "XL"],
            "colors": [
                {"name": "Mustard", "hex": "#FFD700"},
                {"name": "Rani Pink", "hex": "#FF1493"}
            ]
        },
        {
            "name": "Gulabi Festive Modern Lehenga",
            "description": "A show-stopping silhouette featuring a minimalist contemporary hot pink lehenga set. Features a modern cropped blouse and a high-waisted skirt with subtle, traditional border patterns. Perfect for weddings, sangeets, and festive nights where you want to slay in premium style.",
            "category": "sarees",
            "price": 8999.0,
            "originalPrice": 11999.0,
            "stock": 8,
            "rating": 4.9,
            "reviews": 32,
            "badge": "NEW",
            "images": ["assets/prod_pink_lehenga.png"],
            "sizes": ["S", "M", "L"],
            "colors": [
                {"name": "Rani Pink", "hex": "#FF1493"},
                {"name": "Peacock Blue", "hex": "#00D2C4"}
            ]
        },
        {
            "name": "Mayur Emerald Silk Saree",
            "description": "Drape yourself in luxury with this heritage emerald green silk saree. Designed with a clean, contemporary body border and a rich pallu adorned with stylized peacock motifs. Combining 80% clean drape elegance and 20% classic folk-art detailing.",
            "category": "sarees",
            "price": 5499.0,
            "originalPrice": 7999.0,
            "stock": 10,
            "rating": 4.7,
            "reviews": 21,
            "badge": "LIMITED",
            "images": ["assets/prod_emerald_saree.png"],
            "sizes": ["Free Size"],
            "colors": [
                {"name": "Emerald", "hex": "#38A169"},
                {"name": "Mustard", "hex": "#FFD700"}
            ]
        },
        {
            "name": "Indigo SAFAR Fusion Set",
            "description": "Navigate modern life in style with this Indo-western crop top and wide-leg trousers set. Crafted in deep indigo blue, featuring bold geometric motifs and contrast piping. An easy-breezy statement piece designed for the modern fashion wanderer.",
            "category": "fusion",
            "price": 3799.0,
            "originalPrice": 4999.0,
            "stock": 12,
            "rating": 4.6,
            "reviews": 15,
            "badge": "HOT",
            "images": ["assets/prod_blue_fusion.png"],
            "sizes": ["S", "M", "L", "XL"],
            "colors": [
                {"name": "Indigo Blue", "hex": "#1E3A8A"},
                {"name": "Coral Orange", "hex": "#FF7F50"}
            ]
        },
        {
            "name": "Bandhani Saffron Straight Kurti",
            "description": "Add a burst of saffron warmth to your wardrobe. This premium cotton straight-cut kurti blends traditional bandhani tie-dye aesthetics with modern clean lines and custom truck-art tassel detailing on the collar.",
            "category": "kurtas",
            "price": 1899.0,
            "originalPrice": 2499.0,
            "stock": 20,
            "rating": 4.5,
            "reviews": 57,
            "badge": "BESTSELLER",
            "images": ["assets/cat_kurtis.png"],
            "sizes": ["S", "M", "L", "XL", "XXL"],
            "colors": [
                {"name": "Saffron", "hex": "#FF8C00"},
                {"name": "Rani Pink", "hex": "#FF1493"}
            ]
        },
        {
            "name": "Vaikuntha Royal Saree Set",
            "description": "A premium ready-to-wear pre-draped saree set in a rich silk blend. Embellished with delicate gold piping and contrast truck-art floral embroidery along the waist belt, capturing heritage glamor for today's celebrations.",
            "category": "sarees",
            "price": 6499.0,
            "originalPrice": 8999.0,
            "stock": 5,
            "rating": 4.9,
            "reviews": 18,
            "badge": "NEW",
            "images": ["assets/cat_sarees.png"],
            "sizes": ["S", "M", "L"],
            "colors": [
                {"name": "Saree Silk", "hex": "#FF1493"},
                {"name": "Teal", "hex": "#00D2C4"}
            ]
        },
        {
            "name": "Caravan Crop Top & Palazzo Set",
            "description": "A modern fusion co-ord set designed to stand out. Features a structured sleeveless crop top in beige and a pair of flared palazzo pants with vibrant multi-colored borders inspired by highway truck cabin frames.",
            "category": "fusion",
            "price": 3299.0,
            "originalPrice": 4299.0,
            "stock": 14,
            "rating": 4.7,
            "reviews": 29,
            "badge": "HOT",
            "images": ["assets/cat_fusion.png"],
            "sizes": ["S", "M", "L", "XL"],
            "colors": [
                {"name": "Beige", "hex": "#F5F5DC"},
                {"name": "Charcoal", "hex": "#2D3748"}
            ]
        },
        {
            "name": "Mayur Mustard Chanderi Kurti",
            "description": "Crafted in breathable Chanderi silk, this mustard yellow kurti features elegant pintuck details on the chest and a hidden pocket. Styled with vibrant rani pink borders inside the cuffs for a premium peek-a-boo accent.",
            "category": "kurtas",
            "price": 2199.0,
            "originalPrice": 2999.0,
            "stock": 18,
            "rating": 4.8,
            "reviews": 14,
            "badge": "LIMITED",
            "images": ["assets/prod_yellow_kurta.png"],
            "sizes": ["S", "M", "L", "XL"],
            "colors": [
                {"name": "Mustard", "hex": "#FFD700"}
            ]
        }
    ]
    
    db.products.insert_many(initial_products)
    print(f"Products seeded successfully! Total: {len(initial_products)}")
    print("Database seeding completed!")

if __name__ == "__main__":
    seed_db()
