import sys
sys.path.append('.')
from core.config import settings
from database import MongoDB
from core.security import get_password_hash
import asyncio
from datetime import datetime

async def main():
    settings.MONGO_URI = 'mongodb://127.0.0.1:27017'
    settings.DB_NAME = 'hackathon_db'
    await MongoDB.connect()
    db = MongoDB.db
    users = db.users
    email = 'ananya.rao@microsoft.com'
    existing = await users.find_one({'email': email})
    user_doc = {
        'name': 'Ananya Rao',
        'email': email,
        'password': get_password_hash('Ananya@MS2024'),
        'role': 'mentor',
        'is_active': True,
        'createdAt': datetime.utcnow(),
    }
    if existing:
        # Keep this development seed deterministic so the documented login
        # credentials work even when an older test account already exists.
        await users.update_one({'_id': existing['_id']}, {'$set': user_doc})
        mentor_id = str(existing['_id'])
        print('USER_UPDATED', mentor_id)
    else:
        result = await users.insert_one(user_doc)
        mentor_id = str(result.inserted_id)
        print('USER_CREATED', mentor_id)

    await db.mentors.update_one(
        {'userId': mentor_id},
        {'$setOnInsert': {'userId': mentor_id, 'createdAt': datetime.utcnow(), 'availability': 'Available'}},
        upsert=True,
    )

asyncio.run(main())
