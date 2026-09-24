import asyncio
import httpx
from database import MongoDB, get_db
from services.userService import UserService
from core.security import create_access_token

async def inspect():
    await MongoDB.connect()
    db = get_db()

    print("=== 1. DATABASE COLLECTIONS OVERVIEW ===")
    collections = await db.list_collection_names()
    for col in sorted(collections):
        count = await db[col].count_documents({})
        sample = await db[col].find_one({})
        keys = list(sample.keys()) if sample else []
        print(f"  {col}: {count} docs. Sample keys: {keys[:8]}")

    print("\n=== 2. HACKATHONS SAMPLES ===")
    hackathons = await db.hackathons.find({}).to_list(10)
    for h in hackathons:
        print(f"  ID: {h.get('_id')} | Title: {h.get('title')} | Status: {h.get('status')} | OrgId: {h.get('organizerId')} | Dates: {h.get('startDate')} - {h.get('endDate')}")

    print("\n=== 3. ORGANIZERS SAMPLES ===")
    organizers = await db.organizers.find({}).to_list(10)
    for o in organizers:
        print(f"  ID: {o.get('_id')} | Name: {o.get('name')} | Org: {o.get('orgName') or o.get('institutionName')} | UserId: {o.get('userId')} | Status: {o.get('status')}")

    print("\n=== 4. TEAMS SAMPLES ===")
    teams = await db.teams.find({}).to_list(10)
    for t in teams:
        print(f"  ID: {t.get('_id')} | Name: {t.get('name')} | Hackathon: {t.get('hackathonId')} | Mentor: {t.get('mentorId')}")

    print("\n=== 5. SUBMISSIONS SAMPLES ===")
    subs = await db.submissions.find({}).to_list(10)
    for s in subs:
        print(f"  ID: {s.get('_id')} | Title: {s.get('title') or s.get('projectName')} | Status: {s.get('status')} | Team: {s.get('teamId')} | Hackathon: {s.get('hackathonId')}")

    print("\n=== 6. DISPUTES SAMPLES ===")
    disputes = await db.disputes.find({}).to_list(10)
    for d in disputes:
        print(f"  ID: {d.get('_id')} | Reason: {d.get('reason') or d.get('title')} | Status: {d.get('status')} | Target: {d.get('targetType')}")

    print("\n=== 7. CERTIFICATES SAMPLES ===")
    certs = await db.certificates.find({}).to_list(10)
    for c in certs:
        print(f"  ID: {c.get('_id')} | Recipient: {c.get('recipientName') or c.get('userName')} | Hackathon: {c.get('hackathonTitle')} | Status: {c.get('status')}")

    print("\n=== 8. TESTING API ENDPOINTS WITH ADMIN TOKEN ===")
    user = await UserService.authenticate_user("ghariraajan@gmail.com", "Password@123")
    if not user:
        print("Admin user authentication failed!")
        return

    token = create_access_token({"sub": str(user["_id"]), "email": user["email"], "role": user["role"]})
    headers = {"Authorization": f"Bearer {token}"}

    endpoints = [
        "/api/dashboard/metrics",
        "/api/admin/approvals/hackathons",
        "/api/admin/organizers",
        "/api/admin/users",
        "/api/admin/submissions",
        "/api/admin/certificates",
        "/api/admin/disputes",
        "/api/admin/analytics/overview",
        "/api/hackathon/allHackathons",
    ]

    async with httpx.AsyncClient(timeout=10.0) as client:
        for ep in endpoints:
            try:
                res = await client.get(f"http://localhost:8000{ep}", headers=headers)
                print(f"  {ep} -> HTTP {res.status_code}")
                if res.status_code == 200:
                    d = res.json()
                    if isinstance(d, list):
                        print(f"    Returned {len(d)} items")
                    elif isinstance(d, dict):
                        keys_info = []
                        for k, v in list(d.items())[:4]:
                            if isinstance(v, list):
                                keys_info.append(f"{k}: [{len(v)} items]")
                            elif isinstance(v, dict):
                                keys_info.append(f"{k}: {{dict}}")
                            else:
                                keys_info.append(f"{k}: {v}")
                        print(f"    Keys: {', '.join(keys_info)}")
                else:
                    print(f"    Error: {res.text[:120]}")
            except Exception as e:
                print(f"    Failed: {e}")

    await MongoDB.disconnect()

if __name__ == "__main__":
    asyncio.run(inspect())
