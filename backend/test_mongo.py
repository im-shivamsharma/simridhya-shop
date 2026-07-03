from pymongo import MongoClient
import certifi

uri = "mongodb+srv://imshivamzz01_db_user:Shivam6327@simridhya.ynn4ri8.mongodb.net/simrdhya?retryWrites=true&w=majority&appName=simridhya"

client = MongoClient(
    uri,
    tls=True,
    tlsCAFile=certifi.where()
)

print(client.admin.command("ping"))