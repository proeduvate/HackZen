import sys
sys.path.append('.')
from database import MongoDB
import asyncio

async def main():
    await MongoDB.connect()
    db = MongoDB.db
    user = await db.users.find_one({'email': 'ananya.rao@microsoft.com'})
    print('FOUND', bool(user))
    if user:
        print('ROLE', user.get('role'))
        print('EMAIL', user.get('email'))

asyncio.run(main())
