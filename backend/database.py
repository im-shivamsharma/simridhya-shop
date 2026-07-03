from pymongo import MongoClient
from config import Config
import certifi

client = MongoClient(
    Config.MONGO_URI,
    tlsCAFile=certifi.where()
)

db = client.get_default_database()