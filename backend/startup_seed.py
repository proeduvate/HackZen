import os


async def seed_portal_data_if_enabled(db):
    if os.getenv("ENABLE_PORTAL_SEEDING", "").strip().lower() != "true":
        return

    try:
        from seed_student_portal_data import seed_student_data_direct
        await seed_student_data_direct(db)
        print("[Auto-Seeder] Student portal workflow data verified/initialized on startup.")
    except Exception as seeder_err:
        print(f"[Auto-Seeder notice]: {seeder_err}")

    try:
        from seed_organizer_portal_data import seed_organizer_data_direct
        await seed_organizer_data_direct(db)
        print("[Auto-Seeder] Organizer portal workflow data verified/initialized on startup.")
    except Exception as seeder_err:
        print(f"[Auto-Seeder notice]: {seeder_err}")
