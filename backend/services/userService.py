from typing import Optional, Dict, Any
from bson import ObjectId
from datetime import datetime
from core.security import get_password_hash, verify_password
from database import get_user_collection
from schemas.userSchema import UserCreate

class UserService:
    @staticmethod
    async def create_user(user_data: UserCreate) -> Dict[str, Any]:
        users_collection = get_user_collection()
        
        # Check if user exists
        existing_user = await users_collection.find_one({"email": user_data.email})
        if existing_user:
            raise ValueError("Email already registered")
        
        # Create user document
        user_dict = {
            "name": user_data.name,
            "email": user_data.email,
            "password": get_password_hash(user_data.password),
            "role": user_data.role,
            "is_active": True,
            "createdAt": datetime.utcnow()
        }
        
        result = await users_collection.insert_one(user_dict)
        user_id = str(result.inserted_id)
        user_dict["_id"] = user_id
        
        # Initialize role-specific profile
        db = users_collection.database
        if user_data.role == "student":
            await db.students.insert_one({"userId": user_id, "createdAt": datetime.utcnow()})
        elif user_data.role == "mentor":
            await db.mentors.insert_one({"userId": user_id, "createdAt": datetime.utcnow(), "availability": "Available"})
        elif user_data.role == "organizer":
            await db.organizers.insert_one({"userId": user_id, "createdAt": datetime.utcnow()})
            
        return user_dict
    
    @staticmethod
    async def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
        users_collection = get_user_collection()
        
        user = await users_collection.find_one({"email": email})
        if not user:
            return None
        
        match = verify_password(password, user["password"])
        if not match:
            return None
        
        user["_id"] = str(user["_id"])
        return user
    
    @staticmethod
    async def get_user(user_id: str) -> Optional[Dict[str, Any]]:
        users_collection = get_user_collection()
        
        try:
            user = await users_collection.find_one({"_id": ObjectId(user_id)})
            if user:
                user["_id"] = str(user["_id"])
            return user
        except:
            return None
    
    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        return await UserService.get_user(user_id)