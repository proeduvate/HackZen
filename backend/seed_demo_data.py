from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List

import dotenv
from bson import ObjectId
from pymongo import MongoClient

from core.security import get_password_hash


def iso_z(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


backend_dir = Path(__file__).resolve().parent
dotenv.load_dotenv(backend_dir / ".env")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/hackathon_db")
DB_NAME = os.getenv("DB_NAME", "hackathon_db")

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]


OID = lambda value: ObjectId(value)


def require_demo_seed_password() -> str:
    password = os.getenv("DEMO_SEED_PASSWORD")
    if not password or not password.strip():
        raise RuntimeError(
            "DEMO_SEED_PASSWORD is required to seed demo data. "
            "Set it before running this script, for example: "
            "DEMO_SEED_PASSWORD='YourStrongDemoPassword' python seed_demo_data.py"
        )
    return password.strip()


def upsert_one(collection_name: str, filter_doc: Dict[str, Any], document: Dict[str, Any]) -> None:
    db[collection_name].update_one(filter_doc, {"$set": document}, upsert=True)


user_records = [
    {
        "_id": OID("64d2a101b0c2d6a5f0040101"),
        "name": "Aisha Rahman",
        "email": "aisha.admin@hackzen.demo",
        "role": "admin",
        "createdAt": iso_z("2026-01-18T09:00:00Z"),
    },
    {
        "_id": OID("64d2a101b0c2d6a5f0040102"),
        "name": "Rahul Mehta",
        "email": "rahul.organizer@hackzen.demo",
        "role": "organizer",
        "createdAt": iso_z("2026-01-20T10:00:00Z"),
    },
    {
        "_id": OID("64d2a101b0c2d6a5f0040103"),
        "name": "Nina Patel",
        "email": "nina.mentor@hackzen.demo",
        "role": "mentor",
        "createdAt": iso_z("2026-02-01T12:00:00Z"),
    },
    {
        "_id": OID("64d2a101b0c2d6a5f0040104"),
        "name": "Alice Johnson",
        "email": "alice.student@hackzen.demo",
        "role": "student",
        "createdAt": iso_z("2026-02-15T09:30:00Z"),
    },
    {
        "_id": OID("64d2a101b0c2d6a5f0040105"),
        "name": "David Kim",
        "email": "david.student@hackzen.demo",
        "role": "student",
        "createdAt": iso_z("2026-02-16T09:30:00Z"),
    },
    {
        "_id": OID("64d2a101b0c2d6a5f0040106"),
        "name": "Priya Nair",
        "email": "priya.student@hackzen.demo",
        "role": "student",
        "createdAt": iso_z("2026-02-17T09:30:00Z"),
    },
    {
        "_id": OID("64d2a101b0c2d6a5f0040107"),
        "name": "Riya Shah",
        "email": "riya.student@hackzen.demo",
        "role": "student",
        "createdAt": iso_z("2026-02-18T09:30:00Z"),
    },
]

student_profile_records = [
    {
        "_id": OID("64d2b101b0c2d6a5f0041101"),
        "userId": "64d2a101b0c2d6a5f0040104",
        "collegeName": "VIT Vellore",
        "department": "Computer Science",
        "yearOfStudy": 3,
        "skills": ["Python", "React", "FastAPI", "UI/UX"],
    },
    {
        "_id": OID("64d2b101b0c2d6a5f0041102"),
        "userId": "64d2a101b0c2d6a5f0040105",
        "collegeName": "VIT Vellore",
        "department": "Data Science",
        "yearOfStudy": 2,
        "skills": ["Machine Learning", "SQL", "Python"],
    },
    {
        "_id": OID("64d2b101b0c2d6a5f0041103"),
        "userId": "64d2a101b0c2d6a5f0040106",
        "collegeName": "VIT Vellore",
        "department": "Electronics",
        "yearOfStudy": 3,
        "skills": ["IoT", "Embedded Systems", "C++"],
    },
    {
        "_id": OID("64d2b101b0c2d6a5f0041104"),
        "userId": "64d2a101b0c2d6a5f0040107",
        "collegeName": "SRM University",
        "department": "Information Technology",
        "yearOfStudy": 2,
        "skills": ["Product Design", "Research", "UX"],
    },
]

organizer_records = [
    {
        "_id": OID("64d2b201b0c2d6a5f0041201"),
        "userId": "64d2a101b0c2d6a5f0040102",
        "institutionName": "HackZen Foundation",
        "institutionType": "company",
        "designation": "Program Director",
    }
]

mentor_records = [
    {
        "_id": OID("64d2b301b0c2d6a5f0041301"),
        "userId": "64d2a101b0c2d6a5f0040103",
        "expertiseDomains": ["AI/ML", "Product Strategy", "Full Stack"],
        "experienceYears": 7,
        "availability": "Available",
        "bio": "Mentor helping early-stage teams convert research into working demos.",
        "companyName": "TechNova Labs",
        "phoneNumber": "+91-9876543210",
        "linkedinUrl": "https://linkedin.com/in/ninapatel",
    }
]

hackathon_records = [
    {
        "_id": OID("64d2a201b0c2d6a5f0040201"),
        "organizerId": "64d2a101b0c2d6a5f0040102",
        "title": "AI for Accessibility",
        "description": "Build inclusive technology solutions for students and communities with accessibility needs.",
        "location": "Bengaluru",
        "problemStatement": "Design AI-powered tools that improve accessibility in education and daily life.",
        "themes": ["AIML", "GenAI", "Health Care"],
        "registrationStart": iso_z("2026-09-15T00:00:00Z"),
        "registrationEnd": iso_z("2026-09-30T23:59:59Z"),
        "hackathonStart": iso_z("2026-10-10T09:00:00Z"),
        "hackathonEnd": iso_z("2026-10-18T18:00:00Z"),
        "maxTeamSize": 4,
        "minTeamSize": 2,
        "isPublic": True,
        "status": "Registration Open",
        "rules": [
            "Teams must have 2 to 4 members.",
            "Final project must include an AI component.",
            "Code must be submitted before the final demo.",
        ],
        "posterUrl": "https://example.com/posters/ai-accessibility.png",
        "templateUrl": "https://example.com/templates/ai-accessibility.zip",
        "createdAt": iso_z("2026-09-01T09:00:00Z"),
        "updatedAt": iso_z("2026-09-12T10:00:00Z"),
    },
    {
        "_id": OID("64d2a201b0c2d6a5f0040202"),
        "organizerId": "64d2a101b0c2d6a5f0040102",
        "title": "CyberSecure Future",
        "description": "Prototype secure software systems and threat-monitoring experiences.",
        "location": "Hyderabad",
        "problemStatement": "Create secure-by-design digital experiences for modern connected systems.",
        "themes": ["Cyber Security", "Cloud Computing"],
        "registrationStart": iso_z("2026-10-01T00:00:00Z"),
        "registrationEnd": iso_z("2026-10-20T23:59:59Z"),
        "hackathonStart": iso_z("2026-11-01T09:00:00Z"),
        "hackathonEnd": iso_z("2026-11-09T18:00:00Z"),
        "maxTeamSize": 4,
        "minTeamSize": 2,
        "isPublic": True,
        "status": "Upcoming",
        "rules": ["All projects must include threat modeling."],
        "posterUrl": "https://example.com/posters/cyber-future.png",
        "templateUrl": "https://example.com/templates/cyber-future.zip",
        "createdAt": iso_z("2026-09-10T10:00:00Z"),
        "updatedAt": iso_z("2026-09-12T10:10:00Z"),
    },
    {
        "_id": OID("64d2a201b0c2d6a5f0040203"),
        "organizerId": "64d2a101b0c2d6a5f0040102",
        "title": "HealthHack 2025",
        "description": "Past challenge focused on health-tech solutions for underserved communities.",
        "location": "Pune",
        "problemStatement": "Build a healthcare insight product for early detection and patient support.",
        "themes": ["Health Care", "AIML"],
        "registrationStart": iso_z("2025-08-01T00:00:00Z"),
        "registrationEnd": iso_z("2025-08-18T23:59:59Z"),
        "hackathonStart": iso_z("2025-08-22T09:00:00Z"),
        "hackathonEnd": iso_z("2025-08-31T18:00:00Z"),
        "maxTeamSize": 4,
        "minTeamSize": 2,
        "isPublic": True,
        "status": "Completed",
        "rules": ["Final submission had to include a working prototype."],
        "posterUrl": "https://example.com/posters/healthhack-2025.png",
        "templateUrl": "https://example.com/templates/healthhack-2025.zip",
        "createdAt": iso_z("2025-07-01T08:00:00Z"),
        "updatedAt": iso_z("2025-09-01T12:00:00Z"),
    },
]

application_records = [
    {
        "_id": OID("64d2c101b0c2d6a5f0042101"),
        "hackathonId": "64d2a201b0c2d6a5f0040201",
        "userId": "64d2a101b0c2d6a5f0040104",
        "teamId": "64d2a301b0c2d6a5f0040301",
        "status": "approved",
        "appliedAt": iso_z("2026-09-18T11:15:00Z"),
    },
    {
        "_id": OID("64d2c101b0c2d6a5f0042102"),
        "hackathonId": "64d2a201b0c2d6a5f0040202",
        "userId": "64d2a101b0c2d6a5f0040104",
        "teamId": None,
        "status": "pending",
        "appliedAt": iso_z("2026-09-20T12:00:00Z"),
    },
    {
        "_id": OID("64d2c101b0c2d6a5f0042103"),
        "hackathonId": "64d2a201b0c2d6a5f0040201",
        "userId": "64d2a101b0c2d6a5f0040105",
        "teamId": "64d2a301b0c2d6a5f0040301",
        "status": "approved",
        "appliedAt": iso_z("2026-09-18T10:45:00Z"),
    },
    {
        "_id": OID("64d2c101b0c2d6a5f0042104"),
        "hackathonId": "64d2a201b0c2d6a5f0040201",
        "userId": "64d2a101b0c2d6a5f0040106",
        "teamId": "64d2a301b0c2d6a5f0040301",
        "status": "approved",
        "appliedAt": iso_z("2026-09-19T08:15:00Z"),
    },
    {
        "_id": OID("64d2c101b0c2d6a5f0042105"),
        "hackathonId": "64d2a201b0c2d6a5f0040203",
        "userId": "64d2a101b0c2d6a5f0040104",
        "teamId": "64d2a301b0c2d6a5f0040302",
        "status": "approved",
        "appliedAt": iso_z("2025-08-07T08:30:00Z"),
    },
]

team_records = [
    {
        "_id": OID("64d2a301b0c2d6a5f0040301"),
        "hackathonId": "64d2a201b0c2d6a5f0040201",
        "teamName": "NeuralNest",
        "teamCode": "NNST01",
        "createdBy": "Alice Johnson",
        "mentorId": "64d2a101b0c2d6a5f0040103",
        "createdAt": iso_z("2026-09-18T11:05:00Z"),
    },
    {
        "_id": OID("64d2a301b0c2d6a5f0040302"),
        "hackathonId": "64d2a201b0c2d6a5f0040203",
        "teamName": "DataDock",
        "teamCode": "DDCK02",
        "createdBy": "Alice Johnson",
        "mentorId": "64d2a101b0c2d6a5f0040103",
        "createdAt": iso_z("2025-08-05T09:10:00Z"),
    },
]

team_member_records = [
    {
        "_id": OID("64d2d101b0c2d6a5f0043101"),
        "teamId": "64d2a301b0c2d6a5f0040301",
        "userId": "64d2a101b0c2d6a5f0040104",
        "role": "leader",
        "joinedAt": iso_z("2026-09-18T11:06:00Z"),
    },
    {
        "_id": OID("64d2d101b0c2d6a5f0043102"),
        "teamId": "64d2a301b0c2d6a5f0040301",
        "userId": "64d2a101b0c2d6a5f0040105",
        "role": "member",
        "joinedAt": iso_z("2026-09-18T11:18:00Z"),
    },
    {
        "_id": OID("64d2d101b0c2d6a5f0043103"),
        "teamId": "64d2a301b0c2d6a5f0040301",
        "userId": "64d2a101b0c2d6a5f0040106",
        "role": "member",
        "joinedAt": iso_z("2026-09-18T11:22:00Z"),
    },
    {
        "_id": OID("64d2d101b0c2d6a5f0043104"),
        "teamId": "64d2a301b0c2d6a5f0040302",
        "userId": "64d2a101b0c2d6a5f0040104",
        "role": "leader",
        "joinedAt": iso_z("2025-08-05T09:15:00Z"),
    },
    {
        "_id": OID("64d2d101b0c2d6a5f0043105"),
        "teamId": "64d2a301b0c2d6a5f0040302",
        "userId": "64d2a101b0c2d6a5f0040107",
        "role": "member",
        "joinedAt": iso_z("2025-08-05T09:18:00Z"),
    },
]

stage_records = [
    {
        "_id": OID("64d2a501b0c2d6a5f0040501"),
        "hackathonId": "64d2a201b0c2d6a5f0040201",
        "title": "Problem Validation",
        "description": "Define the user pain point and prototype direction.",
        "stageOrder": 1,
    },
    {
        "_id": OID("64d2a501b0c2d6a5f0040502"),
        "hackathonId": "64d2a201b0c2d6a5f0040201",
        "title": "Prototype Build",
        "description": "Develop the demo workflow and functional prototype.",
        "stageOrder": 2,
    },
    {
        "_id": OID("64d2a501b0c2d6a5f0040503"),
        "hackathonId": "64d2a201b0c2d6a5f0040201",
        "title": "Final Demo",
        "description": "Prepare final presentation and demo script.",
        "stageOrder": 3,
    },
]

progress_records = [
    {
        "_id": OID("64d2a401b0c2d6a5f0040401"),
        "hackathonId": "64d2a201b0c2d6a5f0040201",
        "teamId": "64d2a301b0c2d6a5f0040301",
        "currentStageId": "64d2a501b0c2d6a5f0040502",
        "status": "in-progress",
        "lastUpdated": iso_z("2026-09-24T15:30:00Z"),
    },
    {
        "_id": OID("64d2a401b0c2d6a5f0040402"),
        "hackathonId": "64d2a201b0c2d6a5f0040203",
        "teamId": "64d2a301b0c2d6a5f0040302",
        "currentStageId": "64d2a501b0c2d6a5f0040503",
        "status": "completed",
        "lastUpdated": iso_z("2025-08-29T18:00:00Z"),
    },
]

milestone_records = [
    {
        "_id": OID("64d2e101b0c2d6a5f0044101"),
        "progressId": "64d2a401b0c2d6a5f0040401",
        "milestoneId": "m_idea_validation",
        "completed": True,
        "verifiedBy": "64d2a101b0c2d6a5f0040103",
        "verifiedAt": iso_z("2026-09-20T11:00:00Z"),
    },
    {
        "_id": OID("64d2e101b0c2d6a5f0044102"),
        "progressId": "64d2a401b0c2d6a5f0040401",
        "milestoneId": "m_proto_build",
        "completed": True,
        "verifiedBy": "64d2a101b0c2d6a5f0040103",
        "verifiedAt": iso_z("2026-09-24T14:30:00Z"),
    },
    {
        "_id": OID("64d2e101b0c2d6a5f0044103"),
        "progressId": "64d2a401b0c2d6a5f0040401",
        "milestoneId": "m_demo_ready",
        "completed": False,
        "verifiedBy": None,
        "verifiedAt": None,
    },
    {
        "_id": OID("64d2e101b0c2d6a5f0044104"),
        "progressId": "64d2a401b0c2d6a5f0040402",
        "milestoneId": "m_health_final",
        "completed": True,
        "verifiedBy": "64d2a101b0c2d6a5f0040103",
        "verifiedAt": iso_z("2025-08-29T18:00:00Z"),
    },
]

submission_records = [
    {
        "_id": OID("64d2a601b0c2d6a5f0040601"),
        "teamId": "64d2a301b0c2d6a5f0040301",
        "stageId": "64d2a501b0c2d6a5f0040502",
        "fileUrl": "https://example.com/uploads/teams/neuralnest/prototype.zip",
        "project": "NeuralNest",
        "desc": "AI-powered accessibility assistant that converts text and voice inputs into accessible learning prompts.",
        "category": "AI/ML",
        "status": "Pending",
        "version": 1,
        "submittedAt": iso_z("2026-09-24T13:45:00Z"),
    },
    {
        "_id": OID("64d2a601b0c2d6a5f0040602"),
        "teamId": "64d2a301b0c2d6a5f0040302",
        "stageId": "64d2a501b0c2d6a5f0040503",
        "fileUrl": "https://example.com/uploads/teams/datadock/final-submission.zip",
        "project": "DataDock",
        "desc": "Healthcare analytics dashboard for screening and patient communication support.",
        "category": "Healthcare",
        "status": "Approved",
        "version": 1,
        "submittedAt": iso_z("2025-08-28T16:00:00Z"),
    },
]

certificate_records = [
    {
        "_id": OID("64d2a701b0c2d6a5f0040701"),
        "userId": "64d2a101b0c2d6a5f0040104",
        "teamId": "64d2a301b0c2d6a5f0040302",
        "hackathonId": "64d2a201b0c2d6a5f0040203",
        "certificateUrl": "/api/certificates/view/64d2a101b0c2d6a5f0040104_64d2a201b0c2d6a5f0040203",
        "filePath": "/uploads/certificates/alice_healthhack_2025.pdf",
        "issuedAt": iso_z("2025-09-02T10:00:00Z"),
    }
]

notification_records = [
    {
        "_id": OID("64d2a801b0c2d6a5f0040801"),
        "userId": "64d2a101b0c2d6a5f0040104",
        "hackathonId": "64d2a201b0c2d6a5f0040201",
        "type": "team_invite",
        "message": "You have been invited to join the NeuralNest team.",
        "read": False,
        "createdAt": iso_z("2026-09-18T11:10:00Z"),
    },
    {
        "_id": OID("64d2a801b0c2d6a5f0040802"),
        "userId": "64d2a101b0c2d6a5f0040104",
        "hackathonId": "64d2a201b0c2d6a5f0040201",
        "type": "mentor_assignment",
        "message": "Nina Patel has been assigned as your mentor for AI for Accessibility.",
        "read": True,
        "createdAt": iso_z("2026-09-18T11:30:00Z"),
    },
    {
        "_id": OID("64d2a801b0c2d6a5f0040803"),
        "userId": "64d2a101b0c2d6a5f0040104",
        "hackathonId": "64d2a201b0c2d6a5f0040203",
        "type": "certificate_issued",
        "message": "Your certificate for HealthHack 2025 is now available.",
        "read": True,
        "createdAt": iso_z("2025-09-02T10:05:00Z"),
    },
    {
        "_id": OID("64d2a801b0c2d6a5f0040804"),
        "userId": "64d2a101b0c2d6a5f0040104",
        "hackathonId": "64d2a201b0c2d6a5f0040201",
        "type": "submission_reminder",
        "message": "Your prototype submission is due tomorrow.",
        "read": False,
        "createdAt": iso_z("2026-09-24T09:00:00Z"),
    },
]


def seed_collection(collection_name: str, records: Iterable[Dict[str, Any]], unique_key: str = "_id") -> int:
    count = 0
    for record in records:
        key = record.get(unique_key)
        if unique_key == "_id":
            filter_doc = {"_id": record["_id"]}
        else:
            filter_doc = {unique_key: record[unique_key]}
        db[collection_name].update_one(filter_doc, {"$set": record}, upsert=True)
        count += 1
    return count


def main() -> None:
    demo_seed_password = require_demo_seed_password()
    print(f"Connecting to MongoDB: {MONGO_URI}")
    print(f"Target database: {DB_NAME}")

    # Preserve existing data and upsert only the demo records.
    for user in user_records:
        user["password"] = get_password_hash(demo_seed_password)
        upsert_one("users", {"email": user["email"]}, user)

    for profile in student_profile_records:
        upsert_one("students", {"userId": profile["userId"]}, profile)

    for organizer in organizer_records:
        upsert_one("organizers", {"userId": organizer["userId"]}, organizer)

    for mentor in mentor_records:
        upsert_one("mentors", {"userId": mentor["userId"]}, mentor)

    for hackathon in hackathon_records:
        upsert_one("hackathons", {"_id": hackathon["_id"]}, hackathon)

    for app in application_records:
        upsert_one("applications", {"hackathonId": app["hackathonId"], "userId": app["userId"]}, app)

    for team in team_records:
        upsert_one("teams", {"_id": team["_id"]}, team)

    for member in team_member_records:
        upsert_one(
            "teamMembers",
            {"teamId": member["teamId"], "userId": member["userId"]},
            member,
        )

    for stage in stage_records:
        upsert_one("stages", {"_id": stage["_id"]}, stage)

    for progress_entry in progress_records:
        upsert_one("progress", {"teamId": progress_entry["teamId"]}, progress_entry)

    for milestone in milestone_records:
        upsert_one(
            "milestoneProgress",
            {"progressId": milestone["progressId"], "milestoneId": milestone["milestoneId"]},
            milestone,
        )

    for submission in submission_records:
        upsert_one("submissions", {"teamId": submission["teamId"], "stageId": submission["stageId"]}, submission)

    for certificate in certificate_records:
        upsert_one(
            "certificates",
            {"userId": certificate["userId"], "hackathonId": certificate["hackathonId"]},
            certificate,
        )

    for notification in notification_records:
        upsert_one("notifications", {"_id": notification["_id"]}, notification)

    print("Seed complete.")
    total_users = db.users.count_documents({})
    total_hackathons = db.hackathons.count_documents({})
    total_teams = db.teams.count_documents({})
    total_applications = db.applications.count_documents({})
    total_team_members = db.teamMembers.count_documents({})
    total_progress = db.progress.count_documents({})
    total_milestone = db.milestoneProgress.count_documents({})
    total_submissions = db.submissions.count_documents({})
    total_certificates = db.certificates.count_documents({})
    total_notifications = db.notifications.count_documents({})

    print({
        "users": total_users,
        "students": db.students.count_documents({}),
        "organizers": db.organizers.count_documents({}),
        "mentors": db.mentors.count_documents({}),
        "hackathons": total_hackathons,
        "applications": total_applications,
        "teams": total_teams,
        "teamMembers": total_team_members,
        "progress": total_progress,
        "milestoneProgress": total_milestone,
        "submissions": total_submissions,
        "certificates": total_certificates,
        "notifications": total_notifications,
    })


if __name__ == "__main__":
    main()
