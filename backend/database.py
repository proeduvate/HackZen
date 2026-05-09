from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import pymongo
from pymongo.errors import ConnectionFailure
from core.config import settings
import certifi

class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    async def connect(cls):
        try:
            cls.client = AsyncIOMotorClient(
                settings.MONGO_URI,
                maxPoolSize=100,
                minPoolSize=10,
                serverSelectionTimeoutMS=5000,
                tlsCAFile=certifi.where()
            )
            await cls.client.admin.command('ping')
            cls.db = cls.client[settings.DB_NAME]
            print("✅ Connected to MongoDB")
            
            await cls.create_indexes()
            
        except ConnectionFailure as e:
            print(f"❌ MongoDB connection failed: {e}")
            raise

    @classmethod
    async def create_indexes(cls):
        # Clean up old problematic indexes
        try:
            await cls.db.users.drop_index("uid_1")
        except Exception:
            pass # Ignore if it doesn't exist
        try:
            await cls.db.teams.drop_index("team_code_1")
        except Exception:
            pass # Ignore if it doesn't exist
            
        await cls.db.users.create_index([("email", pymongo.ASCENDING)], unique=True)
        await cls.db.users.create_index([("role", pymongo.ASCENDING)])
        
        # Profile collections
        await cls.db.students.create_index([("userId", pymongo.ASCENDING)], unique=True)
        await cls.db.mentors.create_index([("userId", pymongo.ASCENDING)], unique=True)
        await cls.db.organizers.create_index([("userId", pymongo.ASCENDING)], unique=True)
        
        # Hackathons collection
        await cls.db.hackathons.create_index([("organizerId", pymongo.ASCENDING)])
        await cls.db.hackathons.create_index([("status", pymongo.ASCENDING)])
        
        # Teams collection
        await cls.db.teams.create_index([("teamCode", pymongo.ASCENDING)], unique=True)
        await cls.db.teams.create_index([("hackathonId", pymongo.ASCENDING)])
        await cls.db.teams.create_index([("hackathonId", pymongo.ASCENDING), ("teamName", pymongo.ASCENDING)], unique=True)
        await cls.db.teams.create_index([("createdBy", pymongo.ASCENDING)])
        
        # Team Members
        await cls.db.teamMembers.create_index([("teamId", pymongo.ASCENDING), ("userId", pymongo.ASCENDING)], unique=True)
        
        # Applications
        await cls.db.applications.create_index([("hackathonId", pymongo.ASCENDING), ("userId", pymongo.ASCENDING)], unique=True)
        
        # Chat messages
        await cls.db.chats.create_index([("teamId", pymongo.ASCENDING), ("createdAt", pymongo.DESCENDING)])
        
        # Progress tracking
        await cls.db.progress.create_index([("teamId", pymongo.ASCENDING)], unique=True)
        await cls.db.milestoneProgress.create_index([("progressId", pymongo.ASCENDING), ("milestoneId", pymongo.ASCENDING)], unique=True)
        
        print("✅ MongoDB indexes created")

    @classmethod
    async def disconnect(cls):
        if cls.client:
            cls.client.close()
            print("✅ Disconnected from MongoDB")

    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        if cls.db is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return cls.db

def get_db() -> AsyncIOMotorDatabase:
    return MongoDB.get_db()

def get_user_collection():
    return MongoDB.get_db().users

def get_hackathon_collection():
    return MongoDB.get_db().hackathons

def get_team_collection():
    return MongoDB.get_db().teams

def get_chat_collection():
    return MongoDB.get_db().chat_messages

def get_progress_collection():
    return MongoDB.get_db().progress

def get_ai_embeddings_collection():
    return MongoDB.get_db().ai_embeddings

def get_certificates_collection():
    return MongoDB.get_db().certificates

def get_notifications_collection():
    return MongoDB.get_db().notifications

def get_mentor_allocations_collection():
    return MongoDB.get_db().mentor_allocations

def get_milestones_collection():
    return MongoDB.get_db().milestones