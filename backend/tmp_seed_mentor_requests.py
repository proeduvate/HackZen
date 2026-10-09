"""Development-only seed for real mentor-request workflow testing.

Run after tmp_seed_mentor.py. It creates three pending requests for the
Ananya Rao mentor account. Approving one through the UI updates the actual
team's mentorId, so the team appears on the mentor dashboard and Assigned
Teams page.
"""

import asyncio
from datetime import datetime, timedelta

from core.config import settings
from core.security import get_password_hash
from database import MongoDB


SEED_TAG = "mentor-requests-v1"
MENTOR_EMAIL = "ananya.rao@microsoft.com"
REQUEST_TEAMS = [
    ("Nova Health", "HealthTech", "Building a bilingual care-navigation platform for small clinics.", "Product strategy"),
    ("OrbitLearn", "EdTech", "An adaptive practice platform that helps students close learning gaps.", "Go-to-market"),
    ("GreenLoop", "ClimateTech", "Helping apartment communities track and reduce their waste output.", "Growth strategy"),
]


async def main():
    settings.MONGO_URI = "mongodb://127.0.0.1:27017"
    settings.DB_NAME = "hackathon_db"
    await MongoDB.connect()
    db = MongoDB.db

    mentor = await db.users.find_one({"email": MENTOR_EMAIL})
    if not mentor:
        raise RuntimeError("Run tmp_seed_mentor.py first to create the mentor account.")
    mentor_id = str(mentor["_id"])

    # Keep repeated runs deterministic without touching real user records.
    old_teams = await db.teams.find({"mentorRequestSeed": SEED_TAG}).to_list(None)
    old_team_ids = [str(team["_id"]) for team in old_teams]
    if old_team_ids:
        await db.mentorRequests.delete_many({"teamId": {"$in": old_team_ids}})
        await db.teamMembers.delete_many({"teamId": {"$in": old_team_ids}})
        await db.teams.delete_many({"mentorRequestSeed": SEED_TAG})
    await db.hackathons.delete_many({"mentorRequestSeed": SEED_TAG})

    now = datetime.utcnow()
    hackathon = {
        "title": "Mentor Request Demo Hackathon",
        "description": "Local development event for mentor-request testing.",
        "themes": ["Technology"],
        "registrationStart": now - timedelta(days=1),
        "registrationEnd": now + timedelta(days=14),
        "hackathonStart": now + timedelta(days=15),
        "hackathonEnd": now + timedelta(days=17),
        "minTeamSize": 1,
        "maxTeamSize": 5,
        "isPublic": True,
        "status": "Registration Open",
        "organizerId": mentor_id,
        "createdAt": now,
        "updatedAt": now,
        "mentorRequestSeed": SEED_TAG,
    }
    hackathon_id = str((await db.hackathons.insert_one(hackathon)).inserted_id)

    for index, (team_name, domain, description, focus) in enumerate(REQUEST_TEAMS, start=1):
        student_email = f"mentor.request.team{index}@hackzen.local"
        student = await db.users.find_one({"email": student_email})
        if not student:
            student_data = {
                "name": f"{team_name} Lead",
                "email": student_email,
                "password": get_password_hash("Student@123"),
                "role": "student",
                "is_active": True,
                "createdAt": now,
                "mentorRequestSeed": SEED_TAG,
            }
            student_id = str((await db.users.insert_one(student_data)).inserted_id)
            await db.students.update_one(
                {"userId": student_id},
                {"$setOnInsert": {"userId": student_id, "name": student_data["name"], "createdAt": now}},
                upsert=True,
            )
        else:
            student_id = str(student["_id"])

        team = {
            "hackathonId": hackathon_id,
            "teamName": team_name,
            "teamCode": f"MR{index}2026",
            "createdBy": student_id,
            "createdAt": now,
            "domain": domain,
            "description": description,
            "mentorRequestStatus": "pending",
            "mentorRequestSeed": SEED_TAG,
        }
        team_id = str((await db.teams.insert_one(team)).inserted_id)
        await db.teamMembers.insert_one({"teamId": team_id, "userId": student_id, "role": "leader", "joinedAt": now})
        await db.mentorRequests.insert_one({
            "teamId": team_id,
            "mentorId": mentor_id,
            "requestedBy": student_id,
            "message": f"We are looking for mentorship on {focus.lower()}.",
            "matchReason": focus,
            "status": "pending",
            "createdAt": now,
            "mentorRequestSeed": SEED_TAG,
        })

    print("Seeded 3 real pending mentor requests for Ananya Rao.")
    await MongoDB.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
