import os
import uuid
import cloudinary
import cloudinary.uploader
from config import Config

# Configure Cloudinary if credentials exist
if Config.CLOUDINARY_CLOUD_NAME and Config.CLOUDINARY_API_KEY:
    cloudinary.config(
        cloud_name=Config.CLOUDINARY_CLOUD_NAME,
        api_key=Config.CLOUDINARY_API_KEY,
        api_secret=Config.CLOUDINARY_API_SECRET
    )

def upload_image(file):
    """
    Uploads a file to Cloudinary if configured.
    Otherwise, saves it locally to frontend/assets/uploads/ and returns the relative path.
    """
    if Config.CLOUDINARY_CLOUD_NAME and Config.CLOUDINARY_API_KEY:
        try:
            upload_result = cloudinary.uploader.upload(file, folder="simrdhya")
            return upload_result.get("secure_url")
        except Exception as e:
            print(f"Cloudinary upload failed: {e}. Falling back to local upload.")
            
    # Local Upload Fallback
    # Determine local directory path (simrdhya-fullstack/frontend/assets/uploads/)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    upload_dir = os.path.join(base_dir, "frontend", "assets", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, filename)
    
    # Save file
    file.save(file_path)
    
    # Return path relative to frontend static folder
    return f"assets/uploads/{filename}"
