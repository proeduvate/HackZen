from typing import Optional, Dict, Any
from bson import ObjectId
from datetime import datetime
from core.security import get_password_hash, verify_password
from database import get_user_collection, MongoDB
from schemas.userSchema import UserCreate, UserRole


class UserService:
    @staticmethod
    async def create_user(user_data: UserCreate) -> Dict[str, Any]:
        if MongoDB.db is None:
            await MongoDB.connect()
        users_collection = get_user_collection()

        # Check if user exists
        email = str(user_data.email).strip().lower()
        existing_user = await users_collection.find_one({"email": email})
        if existing_user:
            raise ValueError("Email already registered")

        # Create user document
        user_dict = {
            "name": user_data.name,
            "email": email,
            "password": get_password_hash(user_data.password),
            "role": user_data.role,
            "is_active": True,
            "createdAt": datetime.utcnow(),
        }

        result = await users_collection.insert_one(user_dict)
        user_id = str(result.inserted_id)
        user_dict["_id"] = user_id

        # Initialize role-specific profile
        db = users_collection.database
        if user_data.role == "student":
            await db.students.insert_one(
                {"userId": user_id, "createdAt": datetime.utcnow()}
            )
        elif user_data.role == "mentor":
            await db.mentors.insert_one(
                {
                    "userId": user_id,
                    "createdAt": datetime.utcnow(),
                    "availability": "Available",
                }
            )
        elif user_data.role == "organizer":
            await db.organizers.insert_one(
                {"userId": user_id, "createdAt": datetime.utcnow()}
            )

        return user_dict

    @staticmethod
    async def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
        if MongoDB.db is None:
            await MongoDB.connect()
        users_collection = get_user_collection()

        # Email addresses are case-insensitive and form fields can accidentally
        # contain leading/trailing spaces.
        normalized_email = email.strip().lower()
        user = await users_collection.find_one({"email": normalized_email})
        if not user:
            return None

        match = verify_password(password, user["password"])
        if not match:
            return None

        user["_id"] = str(user["_id"])
        return user

    @staticmethod
    async def find_or_create_oauth_user(
        *, provider: str, provider_id: str, email: str, name: str
    ) -> Dict[str, Any]:
        """Find an account by a verified provider identity, or create a student account.

        OAuth providers never supply a password we can safely retain, so social-only
        accounts receive an unusable random password hash.
        """
        if MongoDB.db is None:
            await MongoDB.connect()
        users_collection = get_user_collection()
        normalized_email = email.strip().lower()
        provider_field = f"oauth.{provider}.id"
        user = await users_collection.find_one({provider_field: provider_id})

        if not user:
            user = await users_collection.find_one({"email": normalized_email})
            if user:
                await users_collection.update_one(
                    {"_id": user["_id"]},
                    {"$set": {provider_field: provider_id, f"oauth.{provider}.linkedAt": datetime.utcnow()}},
                )
                user = await users_collection.find_one({"_id": user["_id"]})

        if not user:
            user = {
                "name": name.strip() or normalized_email.split("@")[0],
                "email": normalized_email,
                "password": get_password_hash(str(ObjectId())),
                "role": UserRole.STUDENT.value,
                "is_active": True,
                "oauth": {provider: {"id": provider_id, "linkedAt": datetime.utcnow()}},
                "createdAt": datetime.utcnow(),
            }
            result = await users_collection.insert_one(user)
            user["_id"] = result.inserted_id
            await users_collection.database.students.insert_one(
                {"userId": str(result.inserted_id), "createdAt": datetime.utcnow()}
            )

        user["_id"] = str(user["_id"])
        return user

    @staticmethod
    async def get_user(user_id: str) -> Optional[Dict[str, Any]]:
        if MongoDB.db is None:
            await MongoDB.connect()
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
