import sys
sys.path.append('.')
from core.config import settings
from database import MongoDB
import asyncio

async def main():
    settings.MONGO_URI = 'mongodb://127.0.0.1:27017'
    settings.DB_NAME = 'hackathon_db'
    try:
        await MongoDB.connect()
        print('CONNECTED')
    except Exception as e:
        print('CONNECT_FAIL', repr(e))

asyncio.run(main())
