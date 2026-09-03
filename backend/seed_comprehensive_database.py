import asyncio
import os
import sys
from datetime import datetime, timedelta
from bson import ObjectId

# Add backend dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import MongoDB
from core.security import get_password_hash


async def safe_upsert(collection, query_dict, doc):
    """Safely upserts a document without modifying immutable _id if it already exists."""
    doc_set = {k: v for k, v in doc.items() if k != "_id"}
    update_op = {"$set": doc_set}
    if "_id" in doc:
        update_op["$setOnInsert"] = {"_id": doc["_id"]}
    await collection.update_one(query_dict, update_op, upsert=True)


async def seed_database():
    print("=" * 60)
    print("[INIT] STARTING COMPREHENSIVE MOCK DATA SEEDING FOR HACKZEN")
    print("=" * 60)

    await MongoDB.connect()
    db = MongoDB.get_db()

    # Passwords
    default_admin_pwd = get_password_hash("Admin@123")
    default_user_pwd = get_password_hash("Student@123")
    default_mentor_pwd = get_password_hash("Mentor@123")
    default_org_pwd = get_password_hash("Organizer@123")

    now = datetime.now()

    # -------------------------------------------------------------
    # 1. SEED USERS
    # -------------------------------------------------------------
    print("\n[1/10] Seeding Users Directory...")
    
    users_data = [
        # Admins
        {
            "_id": ObjectId("65e010000000000000000001"),
            "name": "Super Admin",
            "email": "admin@proeduvate.com",
            "password": default_admin_pwd,
            "role": "admin",
            "status": "Active",
            "department": "Platform Governance & Security",
            "college": "ProEduvate Central Command",
            "year": "Lead System Overseer",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 98765 43210",
            "adminId": "ADM-2026-0001",
            "createdAt": now - timedelta(days=90),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e010000000000000000002"),
            "name": "Alex Vance",
            "email": "secadmin@proeduvate.com",
            "password": default_admin_pwd,
            "role": "admin",
            "status": "Active",
            "department": "Security & Incident Operations",
            "college": "ProEduvate Central Command",
            "year": "System Admin",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 98765 43211",
            "adminId": "ADM-2026-0002",
            "createdAt": now - timedelta(days=75),
            "updatedAt": now
        },
        # Organizers
        {
            "_id": ObjectId("65e020000000000000000001"),
            "name": "Dr. S. K. Ramanathan",
            "email": "organizer@srm.edu",
            "password": default_org_pwd,
            "role": "ORGANIZER",
            "status": "Active",
            "college": "SRM Institute of Science and Technology",
            "organization": "SRM Innovation & Hackathon Society",
            "department": "Computer Science & Tech Club",
            "year": "Associate Dean (Innovations)",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 94441 23456",
            "createdAt": now - timedelta(days=60),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e020000000000000000002"),
            "name": "Prof. Meera Chandran",
            "email": "techclub@vit.ac.in",
            "password": default_org_pwd,
            "role": "ORGANIZER",
            "status": "Pending",
            "college": "VIT Chennai",
            "organization": "VIT Cyber Defense Club",
            "department": "School of Computer Science",
            "year": "Faculty Advisor",
            "emailVerified": True,
            "isVerified": False,
            "phone": "+91 94442 34567",
            "createdAt": now - timedelta(days=2),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e020000000000000000003"),
            "name": "P. Saravanan",
            "email": "events@iitm.ac.in",
            "password": default_org_pwd,
            "role": "ORGANIZER",
            "status": "Active",
            "college": "IIT Madras",
            "organization": "IITM FinTech & AI Lab",
            "department": "Department of Management Studies",
            "year": "Senior Lead Organizer",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 94443 45678",
            "createdAt": now - timedelta(days=45),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e020000000000000000004"),
            "name": "Dr. Anand Kulkarni",
            "email": "lead@annauniv.edu",
            "password": default_org_pwd,
            "role": "ORGANIZER",
            "status": "Needs Changes",
            "college": "Anna University",
            "organization": "CEG Tech Forum",
            "department": "Information Technology",
            "year": "Club President",
            "emailVerified": True,
            "isVerified": False,
            "phone": "+91 94444 56789",
            "createdAt": now - timedelta(days=5),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e020000000000000000005"),
            "name": "Rahul Deshpande",
            "email": "partner@bits.edu",
            "password": default_org_pwd,
            "role": "ORGANIZER",
            "status": "Rejected",
            "college": "BITS Pilani",
            "organization": "Independent Tech Syndicate",
            "department": "Developer Club",
            "year": "Student Convener",
            "emailVerified": False,
            "isVerified": False,
            "phone": "+91 94445 67890",
            "rejectionReason": "Official college affiliation documents unverified and contact domain expired.",
            "createdAt": now - timedelta(days=15),
            "updatedAt": now
        },
        # Mentors (Include overloaded mentors with 9-12 teams)
        {
            "_id": ObjectId("65e030000000000000000001"),
            "name": "Dr. Ramesh Kumar",
            "email": "dr.ramesh@microsoft.com",
            "password": default_mentor_pwd,
            "role": "MENTOR",
            "status": "Active",
            "college": "Microsoft Research India",
            "department": "Cloud & AI Platforms",
            "year": "Principal AI Scientist",
            "emailVerified": True,
            "isVerified": True,
            "assignedTeamsCount": 12,
            "expertise": ["Generative AI", "Distributed Systems", "Python"],
            "createdAt": now - timedelta(days=80),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e030000000000000000002"),
            "name": "Dr. Priya Nair",
            "email": "priya.nair@iitm.ac.in",
            "password": default_mentor_pwd,
            "role": "MENTOR",
            "status": "Active",
            "college": "IIT Madras",
            "department": "Computer Science & Engineering",
            "year": "Associate Professor",
            "emailVerified": True,
            "isVerified": True,
            "assignedTeamsCount": 10,
            "expertise": ["Machine Learning", "Computer Vision", "HealthTech"],
            "createdAt": now - timedelta(days=70),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e030000000000000000003"),
            "name": "Prof. Arun Selvam",
            "email": "arun.selvam@vit.ac.in",
            "password": default_mentor_pwd,
            "role": "MENTOR",
            "status": "Active",
            "college": "VIT Chennai",
            "department": "School of Electronics",
            "year": "Professor & Lab Head",
            "emailVerified": True,
            "isVerified": True,
            "assignedTeamsCount": 9,
            "expertise": ["IoT Systems", "Embedded Linux", "Edge AI"],
            "createdAt": now - timedelta(days=65),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e030000000000000000004"),
            "name": "Divya Krishnan",
            "email": "divya.k@google.com",
            "password": default_mentor_pwd,
            "role": "MENTOR",
            "status": "Active",
            "college": "Google Cloud Labs",
            "department": "Developer Relations & Infrastructure",
            "year": "Staff Cloud Architect",
            "emailVerified": True,
            "isVerified": True,
            "assignedTeamsCount": 11,
            "expertise": ["Kubernetes", "Microservices", "Cloud Security"],
            "createdAt": now - timedelta(days=60),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e030000000000000000005"),
            "name": "Mohan Das",
            "email": "mohan.das@amazon.com",
            "password": default_mentor_pwd,
            "role": "MENTOR",
            "status": "Active",
            "college": "Amazon Web Services",
            "department": "FinTech Solution Architecture",
            "year": "Senior Solutions Architect",
            "emailVerified": True,
            "isVerified": True,
            "assignedTeamsCount": 9,
            "expertise": ["FinTech", "Blockchain", "High-Throughput Systems"],
            "createdAt": now - timedelta(days=50),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e030000000000000000006"),
            "name": "Ananya Rao",
            "email": "ananya.rao@microsoft.com",
            "password": default_mentor_pwd,
            "role": "MENTOR",
            "status": "Active",
            "college": "Microsoft Research",
            "department": "Data Science & NLP",
            "year": "Senior Research Scientist",
            "emailVerified": True,
            "isVerified": True,
            "assignedTeamsCount": 3,
            "expertise": ["Natural Language Processing", "Vector Embeddings"],
            "createdAt": now - timedelta(days=40),
            "updatedAt": now
        },
        # Students (From top engineering institutions)
        {
            "_id": ObjectId("65e040000000000000000001"),
            "name": "Sarath G",
            "email": "sarath.g@abccollege.edu",
            "password": default_user_pwd,
            "role": "student",
            "status": "Active",
            "college": "ABC Engineering College",
            "department": "Computer Science & Engineering",
            "year": "3rd Year B.Tech",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 91234 56781",
            "createdAt": now - timedelta(days=35),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e040000000000000000002"),
            "name": "M Sailesh",
            "email": "sailesh.m@vitstudent.ac.in",
            "password": default_user_pwd,
            "role": "student",
            "status": "Active",
            "college": "VIT Chennai",
            "department": "Artificial Intelligence & Data Science",
            "year": "4th Year B.Tech",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 91234 56782",
            "createdAt": now - timedelta(days=30),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e040000000000000000003"),
            "name": "Harini V",
            "email": "harini.v@srmstudent.edu",
            "password": default_user_pwd,
            "role": "student",
            "status": "Active",
            "college": "SRM Institute of Science and Technology",
            "department": "Electronics & Communication",
            "year": "3rd Year B.Tech",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 91234 56783",
            "createdAt": now - timedelta(days=28),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e040000000000000000004"),
            "name": "Rohit Sharma",
            "email": "rohit.sharma@iitb.ac.in",
            "password": default_user_pwd,
            "role": "student",
            "status": "Active",
            "college": "IIT Bombay",
            "department": "Computer Science",
            "year": "2nd Year B.Tech",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 91234 56784",
            "createdAt": now - timedelta(days=25),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e040000000000000000005"),
            "name": "Sneha Patel",
            "email": "sneha.patel@nitt.edu",
            "password": default_user_pwd,
            "role": "student",
            "status": "Active",
            "college": "NIT Trichy",
            "department": "Information Technology",
            "year": "4th Year B.Tech",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 91234 56785",
            "createdAt": now - timedelta(days=22),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e040000000000000000006"),
            "name": "Vikram Aditya",
            "email": "vikram.aditya@annauniv.edu",
            "password": default_user_pwd,
            "role": "student",
            "status": "Active",
            "college": "Anna University",
            "department": "Mechatronics Engineering",
            "year": "3rd Year B.Tech",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 91234 56786",
            "createdAt": now - timedelta(days=20),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e040000000000000000007"),
            "name": "Anita Deshmukh",
            "email": "anita.deshmukh@bitsstudent.edu",
            "password": default_user_pwd,
            "role": "student",
            "status": "Active",
            "college": "BITS Pilani",
            "department": "Computer Science & Economics",
            "year": "2nd Year Dual Degree",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 91234 56787",
            "createdAt": now - timedelta(days=18),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e040000000000000000008"),
            "name": "Kavya M",
            "email": "kavya.m@psgtech.edu",
            "password": default_user_pwd,
            "role": "student",
            "status": "Active",
            "college": "PSG College of Technology",
            "department": "Robotics & Automation",
            "year": "4th Year B.Tech",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 91234 56788",
            "createdAt": now - timedelta(days=15),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e040000000000000000009"),
            "name": "Rahul Verma",
            "email": "rahul.verma@delhitechinstitute.edu",
            "password": default_user_pwd,
            "role": "student",
            "status": "Active",
            "college": "Delhi Technological University (DTU)",
            "department": "Software Engineering",
            "year": "3rd Year B.Tech",
            "emailVerified": False,
            "isVerified": False,
            "phone": "+91 91234 56789",
            "createdAt": now - timedelta(days=10),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e040000000000000000010"),
            "name": "Swathi R",
            "email": "swathi.r@ssn.edu.in",
            "password": default_user_pwd,
            "role": "student",
            "status": "Active",
            "college": "SSN College of Engineering",
            "department": "Cyber Security & Forensics",
            "year": "4th Year B.Tech",
            "emailVerified": True,
            "isVerified": True,
            "phone": "+91 91234 56790",
            "createdAt": now - timedelta(days=8),
            "updatedAt": now
        }
    ]

    for user in users_data:
        await safe_upsert(db["users"], {"email": user["email"]}, user)
    print(f"   -> Inserted/Updated {len(users_data)} users.")

    # -------------------------------------------------------------
    # 2. SEED ORGANIZERS PROFILE COLLECTION
    # -------------------------------------------------------------
    print("\n[2/10] Seeding Organizers Profile Collection...")
    
    organizers_collection_data = [
        {
            "_id": ObjectId("65e050000000000000000001"),
            "userId": "65e020000000000000000001",
            "institutionName": "SRM Institute of Science and Technology",
            "organizationName": "SRM Innovation & Hackathon Society",
            "contactEmail": "organizer@srm.edu",
            "contactPhone": "+91 94441 23456",
            "officialWebsite": "https://www.srmist.edu.in",
            "proofDocument": "https://credentials.proeduvate.com/proofs/srm_approval_letter.pdf",
            "status": "Approved",
            "experienceYears": 6,
            "pastEventsHosted": 8,
            "createdAt": now - timedelta(days=60)
        },
        {
            "_id": ObjectId("65e050000000000000000002"),
            "userId": "65e020000000000000000002",
            "institutionName": "VIT Chennai",
            "organizationName": "VIT Cyber Defense Club",
            "contactEmail": "techclub@vit.ac.in",
            "contactPhone": "+91 94442 34567",
            "officialWebsite": "https://chennai.vit.ac.in",
            "proofDocument": "https://credentials.proeduvate.com/proofs/vit_cyber_charter.pdf",
            "status": "Pending",
            "experienceYears": 3,
            "pastEventsHosted": 2,
            "createdAt": now - timedelta(days=2)
        },
        {
            "_id": ObjectId("65e050000000000000000003"),
            "userId": "65e020000000000000000003",
            "institutionName": "IIT Madras",
            "organizationName": "IITM FinTech & AI Lab",
            "contactEmail": "events@iitm.ac.in",
            "contactPhone": "+91 94443 45678",
            "officialWebsite": "https://www.iitm.ac.in",
            "proofDocument": "https://credentials.proeduvate.com/proofs/iitm_institute_endorsement.pdf",
            "status": "Approved",
            "experienceYears": 9,
            "pastEventsHosted": 14,
            "createdAt": now - timedelta(days=45)
        }
    ]

    for org in organizers_collection_data:
        await safe_upsert(db["organizers"], {"contactEmail": org["contactEmail"]}, org)
    print(f"   -> Inserted/Updated {len(organizers_collection_data)} organizer profile records.")

    # -------------------------------------------------------------
    # 3. SEED HACKATHONS
    # -------------------------------------------------------------
    print("\n[3/10] Seeding Hackathons Ecosystem...")

    hackathons_data = [
        {
            "_id": ObjectId("65e060000000000000000001"),
            "title": "Global AI Summit 2026",
            "tagline": "Next-Generation Intelligent Systems & Multimodal AI Jam",
            "theme": "Artificial Intelligence & LLMs",
            "category": "AI / DeepTech",
            "status": "Active",
            "stage": "Stage 2 Final Submissions",
            "currentStage": "Submissions Open",
            "start_date": now - timedelta(days=5),
            "end_date": now + timedelta(days=10),
            "startDate": (now - timedelta(days=5)).strftime("%Y-%m-%d"),
            "endDate": (now + timedelta(days=10)).strftime("%Y-%m-%d"),
            "submissionDeadline": now + timedelta(days=7),
            "totalParticipants": 240,
            "teamCount": 48,
            "minTeamSize": 2,
            "maxTeamSize": 4,
            "organizerId": "65e020000000000000000001",
            "organizerName": "Dr. S. K. Ramanathan",
            "organization": "SRM Institute of Science and Technology",
            "college": "SRM Institute of Science and Technology",
            "description": "Global hackathon challenging participants to develop multimodal vector search engines, agentic workflows, and automated reasoning pipelines.",
            "tracks": ["Generative AI", "Computer Vision", "Health AI", "Autonomous Agents"],
            "prizes": [
                {"place": "1st Prize", "reward": "$10,000 USD + Cloud Credits"},
                {"place": "2nd Prize", "reward": "$5,000 USD"},
                {"place": "3rd Prize", "reward": "$2,500 USD"}
            ],
            "createdAt": now - timedelta(days=20),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e060000000000000000002"),
            "title": "Smart Campus Innovation Jam 2026",
            "tagline": "IoT, Green Energy & Smart Mobility Solutions",
            "theme": "IoT & Smart Infrastructure",
            "category": "Smart Campus",
            "status": "Pending",
            "stage": "Proposal Review",
            "currentStage": "Awaiting Admin Evaluation",
            "start_date": now + timedelta(days=14),
            "end_date": now + timedelta(days=21),
            "startDate": (now + timedelta(days=14)).strftime("%Y-%m-%d"),
            "endDate": (now + timedelta(days=21)).strftime("%Y-%m-%d"),
            "submissionDeadline": now + timedelta(days=20),
            "totalParticipants": 160,
            "teamCount": 32,
            "minTeamSize": 2,
            "maxTeamSize": 5,
            "organizerId": "65e020000000000000000002",
            "organizerName": "Prof. Meera Chandran",
            "organization": "VIT Chennai",
            "college": "VIT Chennai",
            "description": "Transform campus ecosystems with smart energy meters, automated shuttle routing, and decentralized access cards.",
            "tracks": ["Smart Energy", "Campus Security", "Mobility Automation"],
            "createdAt": now - timedelta(days=3),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e060000000000000000003"),
            "title": "CyberKnights Defense Jam 2026",
            "tagline": "Platform Security, Zero-Trust Architecture & Threat Hunting",
            "theme": "Cybersecurity & Cryptography",
            "category": "Cybersecurity",
            "status": "Active",
            "stage": "Milestone 1 Code Scrutiny",
            "currentStage": "Active Security Jam",
            "start_date": now - timedelta(days=3),
            "end_date": now + timedelta(days=12),
            "startDate": (now - timedelta(days=3)).strftime("%Y-%m-%d"),
            "endDate": (now + timedelta(days=12)).strftime("%Y-%m-%d"),
            "submissionDeadline": now + timedelta(days=8),
            "totalParticipants": 180,
            "teamCount": 36,
            "minTeamSize": 1,
            "maxTeamSize": 4,
            "organizerId": "65e020000000000000000003",
            "organizerName": "P. Saravanan",
            "organization": "IIT Madras",
            "college": "IIT Madras",
            "description": "Defend high-assurance infrastructure, reverse malware vector samples, and construct zero-knowledge verifiable credentials.",
            "tracks": ["Zero-Trust Defense", "ZK-Proofs", "Threat Intelligence"],
            "createdAt": now - timedelta(days=15),
            "updatedAt": now
        },
        {
            "_id": ObjectId("65e060000000000000000004"),
            "title": "FinTech Innovate Challenge 2026",
            "tagline": "Next-Gen Algorithmic Trading & Decentralized Settlement",
            "theme": "FinTech & Real-Time Payments",
            "category": "FinTech",
            "status": "Draft",
            "stage": "Draft Proposal",
            "currentStage": "Organizer Drafting",
            "start_date": now + timedelta(days=30),
            "end_date": now + timedelta(days=40),
            "startDate": (now + timedelta(days=30)).strftime("%Y-%m-%d"),
            "endDate": (now + timedelta(days=40)).strftime("%Y-%m-%d"),
            "totalParticipants": 0,
            "teamCount": 0,
            "minTeamSize": 2,
            "maxTeamSize": 4,
            "organizerId": "65e020000000000000000004",
            "organizerName": "Dr. Anand Kulkarni",
            "organization": "Anna University",
            "college": "Anna University",
            "description": "Build high-throughput payment channels, automated fraud scoring, and cross-border settlement protocols.",
            "tracks": ["Fraud Prevention", "Cross-Border Remittance", "Micro-Investments"],
            "createdAt": now - timedelta(days=4),
            "updatedAt": now
        }
    ]

    for hackathon in hackathons_data:
        await safe_upsert(db["hackathons"], {"title": hackathon["title"]}, hackathon)
    print(f"   -> Inserted/Updated {len(hackathons_data)} hackathons.")

    # -------------------------------------------------------------
    # 4. SEED TEAMS & TEAM MEMBERS
    # -------------------------------------------------------------
    print("\n[4/10] Seeding Teams and Team Members...")

    teams_data = [
        {
            "_id": ObjectId("65e070000000000000000001"),
            "name": "Team Alpha",
            "teamName": "Team Alpha",
            "teamCode": "ALPHA-9021",
            "hackathonId": "65e060000000000000000001",
            "leaderId": "65e040000000000000000001",
            "mentorId": "65e030000000000000000001",
            "status": "submitted",
            "college": "ABC Engineering College",
            "members": [
                {"name": "Sarath G", "email": "sarath.g@abccollege.edu", "role": "Team Lead"},
                {"name": "Anita Deshmukh", "email": "anita.deshmukh@bitsstudent.edu", "role": "Fullstack Developer"}
            ],
            "createdAt": now - timedelta(days=12)
        },
        {
            "_id": ObjectId("65e070000000000000000002"),
            "name": "Team NeuralKnights",
            "teamName": "Team NeuralKnights",
            "teamCode": "NEURAL-4481",
            "hackathonId": "65e060000000000000000001",
            "leaderId": "65e040000000000000000002",
            "mentorId": "65e030000000000000000002",
            "status": "submitted",
            "college": "VIT Chennai",
            "members": [
                {"name": "M Sailesh", "email": "sailesh.m@vitstudent.ac.in", "role": "Team Lead"},
                {"name": "Kavya M", "email": "kavya.m@psgtech.edu", "role": "ML Engineer"}
            ],
            "createdAt": now - timedelta(days=10)
        },
        {
            "_id": ObjectId("65e070000000000000000003"),
            "name": "Team QuantumLeap",
            "teamName": "Team QuantumLeap",
            "teamCode": "QUANTUM-3190",
            "hackathonId": "65e060000000000000000002",
            "leaderId": "65e040000000000000000003",
            "mentorId": "65e030000000000000000003",
            "status": "submitted",
            "college": "SRM Institute of Science and Technology",
            "members": [
                {"name": "Harini V", "email": "harini.v@srmstudent.edu", "role": "Team Lead"},
                {"name": "Rohit Sharma", "email": "rohit.sharma@iitb.ac.in", "role": "Systems Architect"}
            ],
            "createdAt": now - timedelta(days=8)
        },
        {
            "_id": ObjectId("65e070000000000000000004"),
            "name": "Team Delta",
            "teamName": "Team Delta",
            "teamCode": "DELTA-8821",
            "hackathonId": "65e060000000000000000001",
            "leaderId": "65e040000000000000000009",
            "mentorId": "65e030000000000000000001",
            "status": "submitted",
            "college": "Delhi Technological University (DTU)",
            "members": [
                {"name": "Rahul Verma", "email": "rahul.verma@delhitechinstitute.edu", "role": "Team Lead"}
            ],
            "createdAt": now - timedelta(days=7)
        },
        {
            "_id": ObjectId("65e070000000000000000005"),
            "name": "Team ByteCrafters",
            "teamName": "Team ByteCrafters",
            "teamCode": "BYTE-9014",
            "hackathonId": "65e060000000000000000003",
            "leaderId": "65e040000000000000000006",
            "mentorId": "65e030000000000000000004",
            "status": "submitted",
            "college": "Anna University",
            "members": [
                {"name": "Vikram Aditya", "email": "vikram.aditya@annauniv.edu", "role": "Team Lead"},
                {"name": "Swathi R", "email": "swathi.r@ssn.edu.in", "role": "Security Researcher"}
            ],
            "createdAt": now - timedelta(days=6)
        }
    ]

    for team in teams_data:
        await safe_upsert(db["teams"], {"name": team["name"]}, team)
    print(f"   -> Inserted/Updated {len(teams_data)} teams.")

    # -------------------------------------------------------------
    # 5. SEED SUBMISSIONS WITH COMPLETE EVALUATION METRICS
    # -------------------------------------------------------------
    print("\n[5/10] Seeding Submissions & AI Code Heuristics...")

    submissions_data = [
        {
            "_id": ObjectId("65e080000000000000000001"),
            "title": "Project CloudMatrix - Multimodal Agentic Vector Engine",
            "projectTitle": "Project CloudMatrix",
            "teamId": "65e070000000000000000001",
            "teamName": "Team Alpha",
            "hackathonId": "65e060000000000000000001",
            "hackathonTitle": "Global AI Summit 2026",
            "track": "Generative AI",
            "repositoryUrl": "https://github.com/proeduvate-alpha/cloudmatrix-core",
            "demoUrl": "https://cloudmatrix.proeduvate.dev",
            "description": "High-throughput asynchronous vector indexer with automatic fallback re-ranking and multi-agent coordination.",
            "status": "Approved",
            "riskLevel": "LOW",
            "originalityScore": 94,
            "healthScore": 92,
            "isLate": False,
            "techStack": ["Python", "FastAPI", "Qdrant", "React", "Docker"],
            "submittedAt": now - timedelta(days=2),
            "createdAt": now - timedelta(days=2)
        },
        {
            "_id": ObjectId("65e080000000000000000002"),
            "title": "NeuralKnights DeepVision - Medical Image Diagnostics",
            "projectTitle": "NeuralKnights DeepVision",
            "teamId": "65e070000000000000000002",
            "teamName": "Team NeuralKnights",
            "hackathonId": "65e060000000000000000001",
            "hackathonTitle": "Global AI Summit 2026",
            "track": "Health AI",
            "repositoryUrl": "https://github.com/neuralknights/deepvision-medical",
            "demoUrl": "https://deepvision.vit.ac.in",
            "description": "Real-time edge neural inference pipeline for early anomaly screening in MRI and CT scans.",
            "status": "Pending",
            "riskLevel": "LOW",
            "originalityScore": 88,
            "healthScore": 89,
            "isLate": False,
            "techStack": ["PyTorch", "OpenCV", "TensorRT", "Next.js"],
            "submittedAt": now - timedelta(hours=14),
            "createdAt": now - timedelta(hours=14)
        },
        {
            "_id": ObjectId("65e080000000000000000003"),
            "title": "QuantumLeap Milestone 2 - Decentralized Smart Microgrid",
            "projectTitle": "QuantumLeap Smart Microgrid",
            "teamId": "65e070000000000000000003",
            "teamName": "Team QuantumLeap",
            "hackathonId": "65e060000000000000000002",
            "hackathonTitle": "Smart Campus Innovation Jam 2026",
            "track": "Smart Energy",
            "repositoryUrl": "https://github.com/quantumleap/smart-microgrid",
            "demoUrl": "https://microgrid.srm.edu",
            "description": "Automated peer-to-peer solar energy credits trading system built for campus dormitories.",
            "status": "Approved",
            "riskLevel": "LOW",
            "originalityScore": 91,
            "healthScore": 95,
            "isLate": False,
            "techStack": ["Solidity", "Rust", "ESP32 IoT", "TailwindCSS"],
            "submittedAt": now - timedelta(days=1),
            "createdAt": now - timedelta(days=1)
        },
        {
            "_id": ObjectId("65e080000000000000000004"),
            "title": "Copied ML Diagnostic Pipeline #SUB-8821",
            "projectTitle": "Automated Medical Predictor",
            "teamId": "65e070000000000000000004",
            "teamName": "Team Delta",
            "hackathonId": "65e060000000000000000001",
            "hackathonTitle": "Global AI Summit 2026",
            "track": "Health AI",
            "repositoryUrl": "https://github.com/team-delta/medical-predictor",
            "demoUrl": "",
            "description": "High code duplication match against open-source repo github.com/open-ai/reference-health-llm.",
            "status": "Rejected",
            "riskLevel": "HIGH",
            "originalityScore": 32,
            "healthScore": 45,
            "isLate": False,
            "plagiarismFlag": True,
            "techStack": ["Python", "Flask"],
            "submittedAt": now - timedelta(days=3),
            "createdAt": now - timedelta(days=3)
        },
        {
            "_id": ObjectId("65e080000000000000000005"),
            "title": "ByteCrafters Zero-Trust Sentinel #SUB-9014",
            "projectTitle": "ByteCrafters Zero-Trust Sentinel",
            "teamId": "65e070000000000000000005",
            "teamName": "Team ByteCrafters",
            "hackathonId": "65e060000000000000000003",
            "hackathonTitle": "CyberKnights Defense Jam 2026",
            "track": "Zero-Trust Defense",
            "repositoryUrl": "https://github.com/bytecrafters/sentinel-zt",
            "demoUrl": "https://sentinel.annauniv.edu",
            "description": "eBPF-driven kernel packet inspection filter for detecting covert privilege escalations.",
            "status": "Pending",
            "riskLevel": "MEDIUM",
            "originalityScore": 82,
            "healthScore": 79,
            "isLate": True,
            "techStack": ["C++", "eBPF", "Go", "Vue.js"],
            "submittedAt": now - timedelta(hours=4),
            "createdAt": now - timedelta(hours=4)
        }
    ]

    for sub in submissions_data:
        await safe_upsert(db["submissions"], {"title": sub["title"]}, sub)
    print(f"   -> Inserted/Updated {len(submissions_data)} submissions.")

    # -------------------------------------------------------------
    # 6. SEED DISPUTES & INCIDENT REPORTS
    # -------------------------------------------------------------
    print("\n[6/10] Seeding Dispute Cases & SLA Escalations...")

    disputes_data = [
        {
            "_id": ObjectId("65e090000000000000000001"),
            "disputeId": "DSP-2026-00421",
            "disputeCode": "DSP-2026-00421",
            "title": "Plagiarism Escalation: Unattributed Heuristic Code Mirroring",
            "type": "Plagiarism",
            "category": "Plagiarism",
            "severity": "CRITICAL",
            "status": "INVESTIGATING",
            "hackathonId": "65e060000000000000000001",
            "hackathonTitle": "Global AI Summit 2026",
            "teamId": "65e070000000000000000004",
            "teamName": "Team Delta",
            "similarityScore": "94%",
            "reporter": {
                "name": "M Sailesh",
                "email": "sailesh.m@vitstudent.ac.in",
                "role": "Team Lead (Team NeuralKnights)",
                "previousReports": 0,
                "accuracyRating": "100%"
            },
            "reportedTeam": {
                "name": "Team Delta",
                "lead": "Rahul Verma",
                "email": "rahul.verma@delhitechinstitute.edu",
                "college": "Delhi Technological University (DTU)",
                "submissionId": "65e080000000000000000004"
            },
            "description": "Code similarity detection detected 94% verbatim line-by-line function logic overlap against open source reference repository.",
            "evidenceUrl": "https://github.com/team-delta/medical-predictor/blob/main/src/ml/model.py",
            "slaDeadline": now + timedelta(hours=18),
            "createdAt": now - timedelta(hours=6)
        },
        {
            "_id": ObjectId("65e090000000000000000002"),
            "disputeId": "DSP-2026-00389",
            "disputeCode": "DSP-2026-00389",
            "title": "SLA Evaluation Delay on Track 2 Milestone Submission",
            "type": "SLA Delay",
            "category": "SLA Delay",
            "severity": "HIGH",
            "status": "OPEN",
            "hackathonId": "65e060000000000000000003",
            "hackathonTitle": "CyberKnights Defense Jam 2026",
            "teamId": "65e070000000000000000005",
            "teamName": "Team ByteCrafters",
            "reporter": {
                "name": "Vikram Aditya",
                "email": "vikram.aditya@annauniv.edu",
                "role": "Participant",
                "previousReports": 1,
                "accuracyRating": "90%"
            },
            "description": "Stage 1 evaluation score pending review past the 48-hour organizer review deadline threshold.",
            "slaDeadline": now + timedelta(hours=24),
            "createdAt": now - timedelta(hours=28)
        },
        {
            "_id": ObjectId("65e090000000000000000003"),
            "disputeId": "DSP-2026-00214",
            "disputeCode": "DSP-2026-00214",
            "title": "Unauthorized Pre-built Framework Usage Flag",
            "type": "Rule Infraction",
            "category": "Rule Infraction",
            "severity": "MEDIUM",
            "status": "RESOLVED",
            "hackathonId": "65e060000000000000000002",
            "hackathonTitle": "Smart Campus Innovation Jam 2026",
            "teamId": "65e070000000000000000003",
            "teamName": "Team QuantumLeap",
            "reporter": {
                "name": "Prof. Meera Chandran",
                "email": "techclub@vit.ac.in",
                "role": "Organizer",
                "previousReports": 4,
                "accuracyRating": "100%"
            },
            "description": "Investigated library dependency; determined external package was permissible under MIT open-source license.",
            "resolutionNotes": "Administrative review confirmed library compliance. Team cleared with zero penalty points.",
            "slaDeadline": now - timedelta(days=2),
            "createdAt": now - timedelta(days=4)
        }
    ]

    for d in disputes_data:
        await safe_upsert(db["disputes"], {"disputeCode": d["disputeCode"]}, d)
    print(f"   -> Inserted/Updated {len(disputes_data)} dispute cases.")

    # -------------------------------------------------------------
    # 7. SEED CERTIFICATES & CREDENTIAL LEDGER
    # -------------------------------------------------------------
    print("\n[7/10] Seeding Certificates Ledger...")

    certificates_data = [
        {
            "_id": ObjectId("65e0a0000000000000000001"),
            "validationId": "CERT-2026-0182",
            "recipientName": "Alex Johnson",
            "recipientEmail": "alex.j@mit.edu",
            "recipientRole": "Student Participant",
            "eventTitle": "Global AI Summit 2026",
            "event": "Global AI Summit 2026",
            "hackathonId": "65e060000000000000000001",
            "type": "Winner",
            "certType": "Winner",
            "status": "Active",
            "issuedBy": "ProEduvate Official Board",
            "dateIssued": (now - timedelta(days=10)).strftime("%b %d, %Y"),
            "verificationUrl": "https://verify.proeduvate.com/CERT-2026-0182",
            "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://verify.proeduvate.com/CERT-2026-0182",
            "createdAt": now - timedelta(days=10)
        },
        {
            "_id": ObjectId("65e0a0000000000000000002"),
            "validationId": "CERT-2026-0183",
            "recipientName": "Sarath G",
            "recipientEmail": "sarath.g@abccollege.edu",
            "recipientRole": "Team Lead",
            "eventTitle": "Global AI Summit 2026",
            "event": "Global AI Summit 2026",
            "hackathonId": "65e060000000000000000001",
            "type": "First Runner Up",
            "certType": "First Runner Up",
            "status": "Active",
            "issuedBy": "ProEduvate Official Board",
            "dateIssued": (now - timedelta(days=8)).strftime("%b %d, %Y"),
            "verificationUrl": "https://verify.proeduvate.com/CERT-2026-0183",
            "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://verify.proeduvate.com/CERT-2026-0183",
            "createdAt": now - timedelta(days=8)
        },
        {
            "_id": ObjectId("65e0a0000000000000000003"),
            "validationId": "CERT-2026-0184",
            "recipientName": "Harini V",
            "recipientEmail": "harini.v@srmstudent.edu",
            "recipientRole": "Developer Contributor",
            "eventTitle": "Smart Campus Innovation Jam 2026",
            "event": "Smart Campus Innovation Jam 2026",
            "hackathonId": "65e060000000000000000002",
            "type": "Participation",
            "certType": "Participation",
            "status": "Active",
            "issuedBy": "SRM Innovation Cell",
            "dateIssued": (now - timedelta(days=5)).strftime("%b %d, %Y"),
            "verificationUrl": "https://verify.proeduvate.com/CERT-2026-0184",
            "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://verify.proeduvate.com/CERT-2026-0184",
            "createdAt": now - timedelta(days=5)
        },
        {
            "_id": ObjectId("65e0a0000000000000000004"),
            "validationId": "CERT-2026-0185",
            "recipientName": "Dr. Ramesh Kumar",
            "recipientEmail": "dr.ramesh@microsoft.com",
            "recipientRole": "Lead Mentor",
            "eventTitle": "Global AI Summit 2026",
            "event": "Global AI Summit 2026",
            "hackathonId": "65e060000000000000000001",
            "type": "Mentor Excellence",
            "certType": "Mentor Excellence",
            "status": "Active",
            "issuedBy": "ProEduvate Official Board",
            "dateIssued": (now - timedelta(days=4)).strftime("%b %d, %Y"),
            "verificationUrl": "https://verify.proeduvate.com/CERT-2026-0185",
            "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://verify.proeduvate.com/CERT-2026-0185",
            "createdAt": now - timedelta(days=4)
        },
        {
            "_id": ObjectId("65e0a0000000000000000005"),
            "validationId": "CERT-2026-0199",
            "recipientName": "Sneha Patel",
            "recipientEmail": "sneha.patel@nitt.edu",
            "recipientRole": "Participant",
            "eventTitle": "Global AI Summit 2026",
            "event": "Global AI Summit 2026",
            "hackathonId": "65e060000000000000000001",
            "type": "Winner",
            "certType": "Winner",
            "status": "Revoked",
            "revocationReason": "Credential invalidated due to post-event team eligibility dispute resolution.",
            "issuedBy": "ProEduvate Official Board",
            "dateIssued": (now - timedelta(days=12)).strftime("%b %d, %Y"),
            "verificationUrl": "https://verify.proeduvate.com/CERT-2026-0199",
            "createdAt": now - timedelta(days=12)
        }
    ]

    for cert in certificates_data:
        await safe_upsert(db["certificates"], {"validationId": cert["validationId"]}, cert)
    print(f"   -> Inserted/Updated {len(certificates_data)} certificates.")

    # -------------------------------------------------------------
    # 8. SEED NOTIFICATIONS & LIVE ANNOUNCEMENTS
    # -------------------------------------------------------------
    print("\n[8/10] Seeding Platform Notifications & Alerts...")

    notifications_data = [
        {
            "_id": ObjectId("65e0b0000000000000000001"),
            "title": "Global AI Summit Stage 2 Deliverables Open",
            "message": "Final project repository commits and live demo submissions are now open until Sunday 11:59 PM IST.",
            "category": "Announcement",
            "type": "platform_announcement",
            "audience": "all",
            "target_audience": "all",
            "priority": "high",
            "read": False,
            "isRead": False,
            "sender": "admin@proeduvate.com",
            "createdAt": now - timedelta(minutes=15)
        },
        {
            "_id": ObjectId("65e0b0000000000000000002"),
            "title": "New Organizer Verification Request Submitted",
            "message": "VIT Chennai Tech Chapter submitted formal institutional credentials for verification.",
            "category": "Organizer",
            "type": "organizer_approval",
            "audience": "admin",
            "target_audience": "admin",
            "priority": "normal",
            "read": False,
            "isRead": False,
            "sender": "techclub@vit.ac.in",
            "createdAt": now - timedelta(hours=2)
        },
        {
            "_id": ObjectId("65e0b0000000000000000003"),
            "title": "High-Priority Dispute Escalation Flagged",
            "message": "Team NeuralKnights submitted a verified code similarity claim against Team Delta.",
            "category": "Dispute",
            "type": "dispute_escalation",
            "audience": "admin",
            "target_audience": "admin",
            "priority": "high",
            "read": False,
            "isRead": False,
            "sender": "system@proeduvate.com",
            "createdAt": now - timedelta(hours=5)
        },
        {
            "_id": ObjectId("65e0b0000000000000000004"),
            "title": "Mentor Load Threshold Warning",
            "message": "5 mentors exceed the 6-team workload threshold. Rebalancing recommended.",
            "category": "Security",
            "type": "security_alert",
            "audience": "admin",
            "target_audience": "admin",
            "priority": "normal",
            "read": True,
            "isRead": True,
            "sender": "system@proeduvate.com",
            "createdAt": now - timedelta(days=1)
        }
    ]

    for notif in notifications_data:
        await safe_upsert(db["notifications"], {"title": notif["title"]}, notif)
    print(f"   -> Inserted/Updated {len(notifications_data)} notifications.")

    # -------------------------------------------------------------
    # 9. SEED AUDIT LOGS
    # -------------------------------------------------------------
    print("\n[9/10] Seeding Administrative Audit Trail...")

    audit_logs_data = [
        {
            "action": "Organizer Approved",
            "module": "Approvals",
            "details": "Approved organizer application for SRM Institute of Science and Technology.",
            "target": "organizer@srm.edu",
            "category": "Organizer",
            "admin_email": "admin@proeduvate.com",
            "adminName": "Super Admin",
            "ip": "127.0.0.1",
            "createdAt": now - timedelta(days=5)
        },
        {
            "action": "Certificate Issued",
            "module": "Certificates",
            "details": "Minted official Winner credential CERT-2026-0182 for Alex Johnson.",
            "target": "CERT-2026-0182",
            "category": "Certificates",
            "admin_email": "admin@proeduvate.com",
            "adminName": "Super Admin",
            "ip": "127.0.0.1",
            "createdAt": now - timedelta(days=3)
        },
        {
            "action": "Dispute Investigation Commenced",
            "module": "Disputes",
            "details": "Initiated automated AST code similarity scan on case DSP-2026-00421.",
            "target": "DSP-2026-00421",
            "category": "Disputes",
            "admin_email": "secadmin@proeduvate.com",
            "adminName": "Alex Vance",
            "ip": "127.0.0.1",
            "createdAt": now - timedelta(hours=6)
        },
        {
            "action": "Platform Broadcast Sent",
            "module": "Settings",
            "details": "Broadcast 'Global AI Summit Stage 2 Deliverables Open' sent to all participants.",
            "target": "All Users",
            "category": "Settings",
            "admin_email": "admin@proeduvate.com",
            "adminName": "Super Admin",
            "ip": "127.0.0.1",
            "createdAt": now - timedelta(minutes=15)
        }
    ]

    for log in audit_logs_data:
        await db["audit_logs"].insert_one(log)
    print(f"   -> Appended {len(audit_logs_data)} audit log entries.")

    # -------------------------------------------------------------
    # 10. SEED ADMIN SETTINGS & PLATFORM THRESHOLDS
    # -------------------------------------------------------------
    print("\n[10/10] Seeding Admin Security Settings & Governance Thresholds...")

    settings_data = {
        "_id": "admin_global_config",
        "autoApproveSubmissions": False,
        "maxTeamSize": 5,
        "minOriginalityScore": 85,
        "plagiarismThreshold": 75,
        "disputeSlaHours": 48,
        "mentorMaxTeams": 6,
        "twoFactorEnforcement": True,
        "maintenanceMode": False,
        "emailNotificationsEnabled": True,
        "autoCertificateGeneration": True,
        "updatedAt": now
    }

    await safe_upsert(db["admin_settings"], {"_id": "admin_global_config"}, settings_data)
    print("   -> Initialized platform governance parameters in admin_settings.")

    print("\n" + "=" * 60)
    print("[SUCCESS] COMPREHENSIVE MOCK DATA SEEDED SUCCESSFULLY!")
    print("=" * 60)
    print("\nLogin Credentials for Testing:")
    print(" - Super Admin: admin@proeduvate.com       | Password: Admin@123")
    print(" - System Admin: secadmin@proeduvate.com    | Password: Admin@123")
    print(" - Organizer:    organizer@srm.edu          | Password: Organizer@123")
    print(" - Lead Mentor:  dr.ramesh@microsoft.com    | Password: Mentor@123")
    print(" - Student Lead: sarath.g@abccollege.edu    | Password: Student@123")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed_database())
