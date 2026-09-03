import asyncio
import os
import sys
from datetime import datetime, timedelta
from bson import ObjectId

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import MongoDB
from core.security import get_password_hash


async def main():
    await MongoDB.connect()
    db = MongoDB.get_db()
    now = datetime.now()

    print("=" * 60)
    print("[INIT] PRESERVING & ENRICHING ALL EXISTING & MOCK USERS")
    print("=" * 60)

    # 1. Existing user records that the user created
    existing_user_updates = [
        {
            "email": "ghariraajan@gmail.com",
            "name": "Hari Raajan (Admin)",
            "role": "ADMIN",
            "status": "Active",
            "department": "Platform Core Administration",
            "college": "ProEduvate Central Command",
            "year": "Super Admin",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 98765 00001",
            "adminId": "ADM-2026-0000",
            "updatedAt": now
        },
        {
            "email": "gsgssarath2005@gmail.com",
            "name": "Sarath",
            "role": "STUDENT",
            "status": "Active",
            "college": "ABC Engineering College",
            "department": "Computer Science & Engineering",
            "year": "3rd Year B.Tech",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 98765 00002",
            "updatedAt": now
        },
        {
            "email": "msailesh@gmail.com",
            "name": "M Sailesh",
            "role": "STUDENT",
            "status": "Active",
            "college": "VIT Chennai",
            "department": "Artificial Intelligence & Data Science",
            "year": "4th Year B.Tech",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 98765 00003",
            "updatedAt": now
        },
        {
            "email": "psaravanan@gmail.com",
            "name": "P Saravanan",
            "role": "ORGANIZER",
            "status": "Active",
            "college": "IIT Madras",
            "organization": "IITM FinTech & AI Lab",
            "department": "Department of Management Studies",
            "year": "Senior Lead Organizer",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 98765 00004",
            "updatedAt": now
        },
        {
            "email": "ananya.rao@microsoft.com",
            "name": "Ananya Rao",
            "role": "MENTOR",
            "status": "Active",
            "college": "Microsoft Research",
            "department": "Data Science & NLP",
            "year": "Senior Research Scientist",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 98765 00005",
            "assignedTeamsCount": 3,
            "updatedAt": now
        }
    ]

    for u in existing_user_updates:
        # Check if user exists, update their profile fields while keeping their original _id and password
        existing = await db["users"].find_one({"email": u["email"]})
        if existing:
            update_data = {k: v for k, v in u.items() if k != "email"}
            # If they don't have password set, provide fallback
            if "password" not in existing or not existing["password"]:
                update_data["password"] = get_password_hash("Password@123")
            await db["users"].update_one({"email": u["email"]}, {"$set": update_data})
            print(f"[PRESERVED & ENRICHED] {u['email']} -> {u['name']} ({u['role']})")
        else:
            u["password"] = get_password_hash("Password@123")
            u["createdAt"] = now
            await db["users"].insert_one(u)
            print(f"[INSERTED] {u['email']} -> {u['name']} ({u['role']})")

    # Link existing organizer to organizers profile collection
    await db["organizers"].update_one(
        {"contactEmail": "psaravanan@gmail.com"},
        {"$set": {
            "institutionName": "IIT Madras",
            "organizationName": "IITM FinTech & AI Lab",
            "contactEmail": "psaravanan@gmail.com",
            "contactPhone": "+91 98765 00004",
            "officialWebsite": "https://www.iitm.ac.in",
            "proofDocument": "https://credentials.proeduvate.com/proofs/iitm_saravanan_endorsement.pdf",
            "status": "Approved",
            "experienceYears": 8,
            "pastEventsHosted": 11,
            "updatedAt": now
        }},
        upsert=True
    )

    total_users = await db["users"].count_documents({})
    print(f"\n[TOTAL ACTIVE USERS IN DATABASE]: {total_users}")
    print("=" * 60)

if __name__ == '__main__':
    asyncio.run(main())
