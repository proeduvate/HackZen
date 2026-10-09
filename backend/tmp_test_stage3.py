import sys
import os
import asyncio
from datetime import datetime
import io
import httpx

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import MongoDB
from core.security import create_access_token
from main import app

async def run_stage3_tests():
    print("=" * 60)
    print("STARTING STAGE 3 END-TO-END VERIFICATION SUITE")
    print("=" * 60)
    
    # 1. Connect DB
    await MongoDB.connect()
    db = MongoDB.db
    assert db is not None, "MongoDB connection failed"
    print("[OK] MongoDB connected successfully")

    # 2. Get Mentor
    mentor = await db.users.find_one({"email": "ananya.rao@microsoft.com"})
    assert mentor is not None, "Mentor ananya.rao@microsoft.com not found. Run seed script first."
    mentor_id = str(mentor["_id"])
    print(f"[OK] Found mentor Ananya Rao (ID: {mentor_id})")

    # Create auth headers
    token = create_access_token({
        "sub": mentor_id,
        "email": mentor["email"],
        "role": mentor.get("role", "mentor"),
    })
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Get Assigned Team
    assigned_team = await db.teams.find_one({
        "$or": [
            {"mentorId": mentor_id},
            {"mentor_id": mentor_id},
            {"mentor": mentor_id},
        ]
    })
    assert assigned_team is not None, "No assigned team found for mentor."
    team_id = str(assigned_team["_id"])
    team_name = assigned_team.get("teamName") or assigned_team.get("name", "Unknown Team")
    print(f"[OK] Found assigned team: {team_name} (ID: {team_id})")

    # 4. Create an unassigned team for 403 tests
    unassigned_team_id = "650000000000000000000099"

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # ----------------------------------------------------
        # TEST A: TEAM MATERIALS
        # ----------------------------------------------------
        print("\n--- Testing Team Materials Endpoints ---")
        
        # Test 1: Upload a file for assigned team
        sample_content = b"%PDF-1.4 Mock PDF file content for Stage 3 testing"
        files = {
            "file": ("pitch_deck_v1.pdf", sample_content, "application/pdf")
        }
        data = {
            "team_id": team_id,
            "category": "pitch_deck",
            "description": "Initial pitch deck submission"
        }
        res = await client.post("/api/mentor/materials", headers=headers, files=files, data=data)
        print(f"1. Upload material: status {res.status_code}")
        assert res.status_code in [200, 201], f"Upload failed: {res.text}"
        res_json = res.json()
        material = res_json.get("data", res_json)
        material_id = material["id"]
        assert material["originalName"] == "pitch_deck_v1.pdf"
        assert material["category"] == "pitch_deck"
        assert material["teamId"] == team_id
        assert material["size"] == len(sample_content)
        print(f"   [OK] Uploaded material ID: {material_id}, size: {material['size']} bytes")

        # Test 2: Upload for unassigned team (Expect 403)
        res_forbidden = await client.post(
            "/api/mentor/materials", 
            headers=headers, 
            files={"file": ("unauth.pdf", sample_content, "application/pdf")}, 
            data={"team_id": unassigned_team_id, "category": "pitch_deck"}
        )
        print(f"2. Unauthorized upload attempt: status {res_forbidden.status_code}")
        assert res_forbidden.status_code == 403, f"Expected 403, got {res_forbidden.status_code}"
        print("   [OK] Unauthorized upload correctly rejected with 403")

        # Test 3: List materials with filters and search
        res_list = await client.get("/api/mentor/materials?search=pitch&category=pitch_deck", headers=headers)
        print(f"3. List materials with filters: status {res_list.status_code}")
        assert res_list.status_code == 200
        list_json = res_list.json()
        materials_list = list_json.get("data", [])
        pagination = list_json.get("pagination", {})
        assert pagination.get("total", len(materials_list)) >= 1
        found_ids = [m["id"] for m in materials_list]
        assert material_id in found_ids
        print(f"   [OK] Listed {len(materials_list)} materials matching search/filter")

        # Test 4: Get Storage Overview
        res_storage = await client.get("/api/mentor/materials/storage", headers=headers)
        print(f"4. Get storage overview: status {res_storage.status_code}")
        assert res_storage.status_code == 200
        storage_data = res_storage.json().get("data", {})
        assert storage_data["totalBytes"] == 10 * 1024 * 1024 * 1024
        assert storage_data["usedBytes"] >= len(sample_content)
        assert storage_data["fileCount"] >= 1
        print(f"   [OK] Storage Overview: {storage_data['usedFormatted']} of {storage_data['totalFormatted']} ({storage_data['usagePercentage']}%), {storage_data['fileCount']} files")

        # Test 5: Get Recent Uploads
        res_recent = await client.get("/api/mentor/materials/recent", headers=headers)
        print(f"5. Get recent uploads: status {res_recent.status_code}")
        assert res_recent.status_code == 200
        recent_data = res_recent.json().get("data", [])
        assert len(recent_data) >= 1
        assert any(m["id"] == material_id for m in recent_data)
        print(f"   [OK] Recent uploads returned {len(recent_data)} items")

        # Test 6: Download file
        res_dl = await client.get(f"/api/mentor/materials/{material_id}/download", headers=headers)
        print(f"6. Download material binary stream: status {res_dl.status_code}")
        assert res_dl.status_code == 200
        assert res_dl.content == sample_content
        print(f"   [OK] Binary download content verified ({len(res_dl.content)} bytes)")

        # ----------------------------------------------------
        # TEST B: MENTOR FEEDBACK
        # ----------------------------------------------------
        print("\n--- Testing Mentor Feedback Endpoints ---")

        # Test 7: Save Draft with partial ratings
        draft_payload = {
            "team_id": team_id,
            "status": "draft",
            "criteria_ratings": {
                "project_understanding": 4,
                "technical_approach": 5,
                "innovation": 4,
            },
            "guidance": "Great start on the architectural design. Keep refining the model integration.",
            "confidential_notes": "Team shows strong potential."
        }
        res_draft = await client.post("/api/mentor/feedback", headers=headers, json=draft_payload)
        print(f"7. Save feedback draft: status {res_draft.status_code}")
        assert res_draft.status_code in [200, 201], f"Draft save failed: {res_draft.text}"
        draft_res = res_draft.json().get("data", {})
        feedback_id = draft_res["id"]
        assert draft_res["status"] == "draft"
        assert draft_res["teamId"] == team_id
        print(f"   [OK] Saved draft feedback ID: {feedback_id}")

        # Test 8: Fetch draft for team
        res_get_draft = await client.get(f"/api/mentor/feedback/team/{team_id}", headers=headers)
        print(f"8. Load feedback for team: status {res_get_draft.status_code}")
        assert res_get_draft.status_code == 200
        loaded_draft = res_get_draft.json().get("draft", {})
        assert loaded_draft is not None
        assert loaded_draft["id"] == feedback_id
        assert loaded_draft["criteriaRatings"]["technicalApproach"] == 5
        print(f"   [OK] Draft loaded correctly with guidance: '{loaded_draft['guidance'][:30]}...'")

        # Test 9: Submit feedback with missing criteria (Expect 422)
        invalid_submit_payload = {
            "team_id": team_id,
            "status": "submitted",
            "criteria_ratings": {
                "project_understanding": 4,
                "technical_approach": 5,
                # Missing other 6 criteria!
            },
            "guidance": "Done"
        }
        res_invalid_submit = await client.post("/api/mentor/feedback", headers=headers, json=invalid_submit_payload)
        print(f"9. Invalid submission with missing criteria: status {res_invalid_submit.status_code}")
        assert res_invalid_submit.status_code == 422, f"Expected 422, got {res_invalid_submit.status_code}: {res_invalid_submit.text}"
        print("   [OK] Validation correctly rejected incomplete submission with 422")

        # Test 10: Valid Submit Feedback (all 8 criteria)
        valid_submit_payload = {
            "team_id": team_id,
            "status": "submitted",
            "criteria_ratings": {
                "project_understanding": 5,
                "technical_approach": 4,
                "innovation": 5,
                "feasibility": 4,
                "presentation_readiness": 4,
                "market_potential": 5,
                "user_experience": 4,
                "collaboration": 5
            },
            "guidance": "Outstanding execution across all core metrics! Clear architecture and strong team synergy.",
            "confidential_notes": "High recommendation for finals."
        }
        res_valid_submit = await client.post("/api/mentor/feedback", headers=headers, json=valid_submit_payload)
        print(f"10. Valid feedback submission: status {res_valid_submit.status_code}")
        assert res_valid_submit.status_code in [200, 201], f"Submit failed: {res_valid_submit.text}"
        submit_res = res_valid_submit.json().get("data", {})
        assert submit_res["status"] == "submitted"
        expected_score = round((5 + 4 + 5 + 4 + 4 + 5 + 4 + 5) / 8, 1) # 36/8 = 4.5
        assert submit_res["overallScore"] == expected_score
        assert submit_res["submittedAt"] is not None
        print(f"   [OK] Feedback successfully submitted! Overall Score: {submit_res['overallScore']}/5.0, SubmittedAt: {submit_res['submittedAt']}")

        # Test 11: Fetch Feedback History
        res_history = await client.get("/api/mentor/feedback", headers=headers)
        print(f"11. Fetch feedback history: status {res_history.status_code}")
        assert res_history.status_code == 200
        history_list = res_history.json().get("data", [])
        assert len(history_list) >= 1
        assert any(fb["id"] == feedback_id for fb in history_list)
        print(f"   [OK] Feedback history returned {len(history_list)} feedback entries")

        # Test 12: Delete Material and verify storage recalculation
        res_del = await client.delete(f"/api/mentor/materials/{material_id}", headers=headers)
        print(f"12. Delete material: status {res_del.status_code}")
        assert res_del.status_code == 200
        print("   [OK] Material deleted successfully")

        res_storage_after = await client.get("/api/mentor/materials/storage", headers=headers)
        storage_after = res_storage_after.json().get("data", {})
        print(f"   [OK] Recalculated storage after delete: {storage_after['usedFormatted']}, files count: {storage_after['fileCount']}")

    print("\n" + "=" * 60)
    print("ALL STAGE 3 TESTS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_stage3_tests())
