"""Development-only data seed for the mentor dashboard.

Creates a public event, 3 teams and named members with their assigned roles,
all assigned to the existing Ananya Rao mentor account. It is idempotent:
rerun it to refresh only records carrying the `mentorDashboardSeed` tag.
"""
import asyncio
from datetime import datetime, timedelta

from core.config import settings
from core.security import get_password_hash
from database import MongoDB

SEED_TAG = "mentor-dashboard-v1"
MENTOR_EMAIL = "ananya.rao@microsoft.com"
TEAMS = [
    ("Nova Builders", 35, "Ideation", [
        ("Aisha Khan", "Team Lead"), ("Rohan Mehta", "Frontend Developer"),
        ("Kavya Iyer", "Backend Developer"), ("Arjun Nair", "UI/UX Designer"),
        ("Meera Shah", "Researcher"),
    ]),
    ("Code Crafters", 60, "Prototype", [
        ("Dev Patel", "Team Lead"), ("Ishita Verma", "Frontend Developer"),
        ("Sanjay Kumar", "Backend Developer"), ("Nisha Menon", "UI/UX Designer"),
        ("Vikram Das", "Researcher"),
    ]),
    ("Impact Orbit", 85, "Final Review", [
        ("Priya Raman", "Team Lead"), ("Aditya Joshi", "Frontend Developer"),
        ("Sneha Reddy", "Backend Developer"), ("Karan Malhotra", "UI/UX Designer"),
        ("Tanvi Gupta", "Researcher"),
    ]),
]

ROLE_VALUES = {
    "Team Lead": "leader",
    "Frontend Developer": "frontend_developer",
    "Backend Developer": "backend_developer",
    "UI/UX Designer": "ui_ux_designer",
    "Researcher": "researcher",
}


async def main():
    settings.MONGO_URI = "mongodb://127.0.0.1:27017"
    settings.DB_NAME = "hackathon_db"
    await MongoDB.connect()
    db = MongoDB.db

    mentor = await db.users.find_one({"email": MENTOR_EMAIL})
    if not mentor:
        raise RuntimeError("Run tmp_seed_mentor.py first to create the mentor account.")
    mentor_id = str(mentor["_id"])
    await db.mentors.update_one({"userId": mentor_id}, {"$set": {"availability": "Available"}, "$setOnInsert": {"userId": mentor_id, "createdAt": datetime.utcnow()}}, upsert=True)

    old_teams = await db.teams.find({"mentorDashboardSeed": SEED_TAG}).to_list(None)
    old_ids = [str(team["_id"]) for team in old_teams]
    if old_ids:
        await db.teamMembers.delete_many({"teamId": {"$in": old_ids}})
        await db.progress.delete_many({"teamId": {"$in": old_ids}})
        await db.tasks.delete_many({"teamId": {"$in": old_ids}})
        await db.submissions.delete_many({"teamId": {"$in": old_ids}})
        await db.teams.delete_many({"mentorDashboardSeed": SEED_TAG})
    await db.hackathons.delete_many({"mentorDashboardSeed": SEED_TAG})
    await db.submissions.delete_many({"mentorDashboardSeed": SEED_TAG})
    await db.meetings.delete_many({"mentorDashboardSeed": SEED_TAG})

    now = datetime.utcnow()
    event = {
        "title": "Mentor Dashboard Test Hackathon", "description": "Local seeded event for mentor dashboard testing.",
        "themes": ["AIML"], "registrationStart": now - timedelta(days=2), "registrationEnd": now + timedelta(days=10),
        "hackathonStart": now + timedelta(days=12), "hackathonEnd": now + timedelta(days=14),
        "maxTeamSize": 5, "minTeamSize": 2, "isPublic": True, "status": "Registration Open",
        "organizerId": mentor_id, "createdAt": now, "updatedAt": now, "mentorDashboardSeed": SEED_TAG,
    }
    event_id = str((await db.hackathons.insert_one(event)).inserted_id)

    submission_samples = [
        ("AI Architecture & System Design", "High-level architecture, user flow diagrams, and API design specifications.", "Pending", timedelta(hours=2)),
        ("Frontend Prototype & User Journey", "Interactive React UI flow with responsive layouts and simulated mock endpoints.", "Approved", timedelta(days=1)),
        ("Final Evaluation Deck & Benchmark", "Final testing reports, benchmark metrics, and video demonstration link.", "Pending", timedelta(hours=6)),
    ]

    meeting_samples = [
        ("Weekly Sprint Sync & Code Review", timedelta(days=1, hours=2), "https://meet.google.com/abc-sprint-sync"),
        ("Milestone Checkpoint & Integration Review", timedelta(days=2, hours=4), "https://teams.microsoft.com/l/meetup/checkpoint"),
        ("Final Evaluation Pre-Screening", timedelta(days=3, hours=1), "https://meet.google.com/impact-final-demo"),
    ]

    for team_index, (team_name, percentage, stage, members) in enumerate(TEAMS, start=1):
        team = {"hackathonId": event_id, "teamName": team_name, "mentorId": mentor_id, "teamCode": f"MDT{team_index}25", "createdBy": "Test Student", "createdAt": now, "domain": "Artificial Intelligence", "mentorDashboardSeed": SEED_TAG}
        team_id = str((await db.teams.insert_one(team)).inserted_id)
        await db.progress.insert_one({"teamId": team_id, "hackathonId": event_id, "percentage": percentage, "currentStage": stage, "status": "in-progress", "lastUpdated": now, "progressHistory": [{"percentage": percentage, "updatedAt": now}], "mentorDashboardSeed": SEED_TAG})
        for student_index, (student_name, member_role) in enumerate(members, start=1):
            email = f"test.team{team_index}.student{student_index}@hackzen.local"
            user = await db.users.find_one({"email": email})
            user_doc = {"name": student_name, "email": email, "password": get_password_hash("Student@123"), "role": "student", "is_active": True, "createdAt": now, "mentorDashboardSeed": SEED_TAG}
            if not user:
                student_id = str((await db.users.insert_one(user_doc)).inserted_id)
                await db.students.update_one({"userId": student_id}, {"$setOnInsert": {"userId": student_id, "name": user_doc["name"], "createdAt": now}}, upsert=True)
            else:
                student_id = str(user["_id"])
                await db.users.update_one({"_id": user["_id"]}, {"$set": user_doc})
                await db.students.update_one({"userId": student_id}, {"$set": {"name": student_name}}, upsert=True)
            await db.teamMembers.insert_one({"teamId": team_id, "userId": student_id, "role": ROLE_VALUES[member_role], "joinedAt": now, "mentorDashboardSeed": SEED_TAG})

        # Seed sample submission
        sub_title, sub_desc, sub_status, sub_offset = submission_samples[team_index - 1]
        await db.submissions.insert_one({
            "teamId": team_id,
            "project": sub_title,
            "title": sub_title,
            "desc": sub_desc,
            "stage": stage,
            "status": sub_status,
            "version": 1,
            "fileUrl": "https://hackzen.local/submissions/demo.pdf",
            "submittedAt": now - sub_offset,
            "mentorDashboardSeed": SEED_TAG,
        })

        # Seed upcoming meeting
        meet_title, meet_offset, meet_link = meeting_samples[team_index - 1]
        await db.meetings.insert_one({
            "mentorId": mentor_id,
            "teamId": team_id,
            "title": meet_title,
            "description": f"Scheduled session with {team_name} to review progress and answer technical questions.",
            "startTime": now + meet_offset,
            "endTime": now + meet_offset + timedelta(hours=1),
            "meetingLink": meet_link,
            "location": "Virtual",
            "status": "scheduled",
            "createdAt": now,
            "updatedAt": now,
            "mentorDashboardSeed": SEED_TAG,
        })

    print("Seeded 3 assigned teams, 15 members, 3 submissions, and 3 upcoming meetings.")
    await MongoDB.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
