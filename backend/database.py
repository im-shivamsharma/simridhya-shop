from pymongo import MongoClient
from config import Config
import certifi

client = MongoClient(
    Config.MONGO_URI,
    tlsCAFile=certifi.where()
)

db = client.get_default_database()

# Create TTL Index on 'expiresAt' field (index automatically expires document when date is reached)
db.otp_verifications.create_index("expiresAt", expireAfterSeconds=0)