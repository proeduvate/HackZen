import sys
sys.path.insert(0, r'C:\Users\Hp\HackZen\backend')
import asyncio
from routers.userRoutes import login
from schemas.userSchema import LoginRequest

async def main():
    response = await login(LoginRequest(email='ananya.rao@microsoft.com', password='Ananya@MS2024'))
    print('TOKEN_OK', bool(response.token))
    print('ROLE', response.user.role)

asyncio.run(main())
