import unittest
from copy import deepcopy
import re
from types import SimpleNamespace
from unittest.mock import patch

from bson import ObjectId
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from core import security
from core.dependencies import with_auth
from routers import dashboard, hackathonRoutes, mentor_dashboard, team


class FakeCursor:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    async def to_list(self, length=None):
        return self.docs if length is None else self.docs[:length]


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = deepcopy(docs or [])
        self.updates = []

    @staticmethod
    def matches(doc, query):
        for key, expected in query.items():
            if key == "$or":
                if not any(FakeCollection.matches(doc, q) for q in expected):
                    return False
                continue
            if key == "$and":
                if not all(FakeCollection.matches(doc, q) for q in expected):
                    return False
                continue
            value = doc
            for part in key.split("."):
                if isinstance(value, list):
                    value = [item.get(part) for item in value if isinstance(item, dict)]
                else:
                    value = value.get(part) if isinstance(value, dict) else None
            if isinstance(expected, dict) and "$exists" in expected:
                exists = key.split(".")[0] in doc
                if exists != expected["$exists"]:
                    return False
            elif isinstance(expected, dict) and "$in" in expected:
                candidates = value if isinstance(value, list) else [value]
                if not any(item in expected["$in"] for item in candidates):
                    return False
            elif isinstance(expected, dict) and "$regex" in expected:
                flags = re.IGNORECASE if expected.get("$options") == "i" else 0
                if value is None or re.search(expected["$regex"], str(value), flags) is None:
                    return False
            elif (expected not in value if isinstance(value, list) else value != expected):
                return False
        return True

    async def find_one(self, query, *_args, **_kwargs):
        return next((doc for doc in self.docs if self.matches(doc, query)), None)

    def find(self, query, *_args, **_kwargs):
        return FakeCursor([doc for doc in self.docs if self.matches(doc, query)])

    async def update_one(self, query, update, **_kwargs):
        self.updates.append((query, update))
        doc = next((doc for doc in self.docs if self.matches(doc, query)), None)
        if doc is None:
            return SimpleNamespace(matched_count=0, modified_count=0)
        self._apply(doc, update, query)
        return SimpleNamespace(matched_count=1, modified_count=1)

    async def update_many(self, query, update):
        self.updates.append((query, update))
        matched = [doc for doc in self.docs if self.matches(doc, query)]
        for doc in matched:
            self._apply(doc, update, query)
        return SimpleNamespace(matched_count=len(matched), modified_count=len(matched))

    @staticmethod
    def _apply(doc, update, query):
        for path, value in update.get("$set", {}).items():
            if ".$." in path:
                field, _, leaf = path.partition(".$.")
                step_id = query.get("nextSteps.id")
                for step in doc.get(field, []):
                    if step.get("id") == step_id:
                        step[leaf] = value
                        break
            else:
                doc[path] = value
        for path, value in update.get("$addToSet", {}).items():
            doc.setdefault(path, [])
            if value not in doc[path]:
                doc[path].append(value)
        for path in update.get("$unset", {}):
            doc.pop(path, None)

    async def insert_many(self, docs):
        self.docs.extend(deepcopy(docs))

    async def insert_one(self, doc):
        self.docs.append(deepcopy(doc))


class FakeDB:
    def __init__(self, **collections):
        self.collections = collections

    def __getitem__(self, name):
        return self.collections.setdefault(name, FakeCollection())

    def __getattr__(self, name):
        return self[name]


class WriteRouteAuthorizationTests(unittest.TestCase):
    def setUp(self):
        self.owner_id = str(ObjectId())
        self.other_id = str(ObjectId())
        self.hackathon_id = ObjectId()
        self.second_hackathon_id = ObjectId()
        self.db = FakeDB(
            hackathons=FakeCollection([
                {"_id": self.hackathon_id, "id": "legacy-id", "organizerId": self.owner_id, "title": "owned"},
                {"_id": self.second_hackathon_id, "organizerId": self.other_id, "title": "other"},
            ]),
            hackathon_approvals=FakeCollection([
                {"_id": ObjectId(), "hackathonId": str(self.hackathon_id), "nextSteps": [{"id": "shared-step", "completed": False}]},
                {"_id": ObjectId(), "hackathonId": str(self.second_hackathon_id), "nextSteps": [{"id": "shared-step", "completed": False}]},
            ]),
            notifications=FakeCollection([
                {"userId": self.owner_id, "read": False},
                {"audience": "organizer", "readBy": []},
                {"audience": "student", "readBy": []},
                {"userId": self.other_id, "read": False},
                {"type": "global_announcement", "readBy": []},
            ]),
            applications=FakeCollection(),
            audit_logs=FakeCollection(),
            mentorRequests=FakeCollection(),
            teams=FakeCollection(),
        )
        self.user = {"sub": self.owner_id, "id": self.owner_id, "role": "organizer"}
        self.app = FastAPI()
        self.app.include_router(hackathonRoutes.router, prefix="/hackathons")
        self.app.include_router(dashboard.router, prefix="/dashboard")
        self.app.include_router(mentor_dashboard.router, prefix="/mentor-dashboard")
        self.app.include_router(mentor_dashboard.router, prefix="/mentor")
        self.app.include_router(team.router, prefix="/teams")
        self.app.dependency_overrides[with_auth] = lambda: self.user
        self.app.dependency_overrides[security.get_current_user] = lambda: self.user
        self.client = TestClient(self.app)
        self.db_patch = patch("routers.dashboard.get_db", return_value=self.db)
        self.db_patch.start()
        self.hackathon_db_patch = patch("routers.hackathonRoutes.get_db", return_value=self.db)
        self.hackathon_db_patch.start()
        self.mentor_db_patch = patch("routers.mentor_dashboard.get_db", return_value=self.db)
        self.mentor_db_patch.start()
        self.team_db_patch = patch("routers.team.get_db", return_value=self.db)
        self.team_db_patch.start()

    def tearDown(self):
        self.db_patch.stop()
        self.hackathon_db_patch.stop()
        self.mentor_db_patch.stop()
        self.team_db_patch.stop()

    def test_timeline_requires_owner_and_uses_canonical_id(self):
        self.user = {**self.user, "sub": self.other_id, "id": self.other_id}
        denied = self.client.put(f"/hackathons/{self.hackathon_id}/timeline", json={"phases": []})
        self.assertEqual(denied.status_code, 403)

        self.user = {"sub": self.owner_id, "id": self.owner_id, "role": "organizer"}
        accepted = self.client.put(f"/hackathons/{self.hackathon_id}/timeline", json={"phases": [{"name": "Build"}]})
        self.assertEqual(accepted.status_code, 200)
        self.assertEqual(self.db.hackathons.docs[0]["timeline"], [{"name": "Build"}])
        self.assertNotIn("timeline", self.db.hackathons.docs[1])
        # Mongo returns a copy; restore the fixture after the service normalizer mutates it.
        self.db.hackathons.docs[0]["_id"] = ObjectId(str(self.hackathon_id))
        self.user = {"sub": self.other_id, "id": self.other_id, "role": "superadmin"}
        superadmin_denied = self.client.put(f"/hackathons/{self.hackathon_id}/timeline", json={"phases": []})
        self.assertEqual(superadmin_denied.status_code, 403)
        self.db.hackathons.docs[0]["_id"] = ObjectId(str(self.hackathon_id))
        self.user = {"sub": self.other_id, "id": self.other_id, "role": "admin"}
        admin_update = self.client.put(f"/hackathons/{self.hackathon_id}/timeline", json={"phases": [{"name": "Admin edit"}]})
        self.assertEqual(admin_update.status_code, 200, admin_update.text)
        noncanonical = self.client.put("/hackathons/not-an-object-id/timeline", json={"phases": []})
        self.assertEqual(noncanonical.status_code, 404)
        legacy_id = self.client.put("/hackathons/legacy-id/timeline", json={"phases": []})
        self.assertEqual(legacy_id.status_code, 404)

    def test_broadcast_explicit_id_is_owner_scoped(self):
        self.user = {"sub": self.other_id, "id": self.other_id, "role": "organizer"}
        denied = self.client.post("/dashboard/organizer-broadcast", json={"title": "x", "message": "y", "hackathonId": str(self.hackathon_id)})
        self.assertEqual(denied.status_code, 404)
        self.assertEqual(self.db.notifications.docs[0].get("title"), None)

        self.user = {"sub": self.owner_id, "id": self.owner_id, "role": "organizer"}
        accepted = self.client.post("/dashboard/organizer-broadcast", json={"title": "x", "message": "y", "hackathonId": str(self.hackathon_id)})
        self.assertEqual(accepted.status_code, 200)
        self.user = {"sub": self.other_id, "id": self.other_id, "role": "admin"}
        admin_denied = self.client.post("/dashboard/organizer-broadcast", json={"title": "x", "message": "y", "hackathonId": str(self.hackathon_id)})
        self.assertEqual(admin_denied.status_code, 404)

    def test_approval_step_requires_owner_parent_and_scopes_one_record(self):
        status_response = self.client.get("/dashboard/organizer-approval-status", params={"hackathonId": str(self.hackathon_id)})
        self.assertEqual(status_response.status_code, 200)
        self.assertEqual(status_response.json()["hackathonId"], str(self.hackathon_id))
        owner_update = self.client.post("/dashboard/organizer-approval-status/toggle-step", json={"hackathonId": str(self.hackathon_id), "stepId": "shared-step", "completed": True})
        self.assertEqual(owner_update.status_code, 200)
        self.assertTrue(self.db.hackathon_approvals.docs[0]["nextSteps"][0]["completed"])
        self.assertFalse(self.db.hackathon_approvals.docs[1]["nextSteps"][0]["completed"])

        self.user = {"sub": self.other_id, "id": self.other_id, "role": "organizer"}
        forbidden = self.client.post("/dashboard/organizer-approval-status/toggle-step", json={"hackathonId": str(self.hackathon_id), "stepId": "shared-step", "completed": False})
        self.assertEqual(forbidden.status_code, 403)
        self.user = {"sub": self.other_id, "id": self.other_id, "role": "admin"}
        admin_update = self.client.post("/dashboard/organizer-approval-status/toggle-step", json={"hackathonId": str(self.second_hackathon_id), "stepId": "shared-step", "completed": True})
        self.assertEqual(admin_update.status_code, 200)
        self.assertTrue(self.db.hackathon_approvals.docs[1]["nextSteps"][0]["completed"])
        missing = self.client.get("/dashboard/organizer-approval-status")
        self.assertEqual(missing.status_code, 404)

    def test_approval_owner_matches_object_id_organizer_id(self):
        self.db.hackathons.docs[0]["organizerId"] = ObjectId(self.owner_id)

        response = self.client.get(
            "/dashboard/organizer-approval-status",
            params={"hackathonId": str(self.hackathon_id)},
        )

        self.assertEqual(response.status_code, 200, response.text)

    def test_mark_all_reads_only_visible_notifications(self):
        response = self.client.put("/dashboard/notifications/read-all")
        self.assertEqual(response.status_code, 200)
        docs = self.db.notifications.docs
        self.assertTrue(docs[0]["read"])
        self.assertIn(self.owner_id, docs[1]["readBy"])
        self.assertNotIn(self.owner_id, docs[2]["readBy"])
        self.assertFalse(docs[3]["read"])
        self.assertIn(self.owner_id, docs[4]["readBy"])

    def test_timeline_rejects_unauthenticated_request(self):
        self.app.dependency_overrides[with_auth] = lambda: (_ for _ in ()).throw(HTTPException(status_code=401))
        response = self.client.put(f"/hackathons/{self.hackathon_id}/timeline", json={"phases": []})
        self.assertEqual(response.status_code, 401)

    def test_duplicate_mentor_decision_route_rejects_nonmentor(self):
        self.user = {"sub": self.other_id, "id": self.other_id, "role": "student"}
        response = self.client.patch("/mentor-dashboard/requests/not-used", json={"decision": "approved"})
        self.assertEqual(response.status_code, 403)

    def test_other_mentor_cannot_decide_assigned_request(self):
        request_id = ObjectId()
        self.db.mentorRequests.docs = [{"_id": request_id, "mentorId": self.owner_id, "teamId": str(ObjectId()), "status": "pending"}]
        self.user = {"sub": self.other_id, "id": self.other_id, "role": "mentor"}

        response = self.client.patch(f"/teams/mentor/requests/{request_id}", json={"decision": "rejected"})

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.db.mentorRequests.docs[0]["status"], "pending")
        self.assertEqual(self.db.mentorRequests.updates, [])

    def test_mentor_can_approve_unassigned_pending_request(self):
        request_id, team_id = ObjectId(), ObjectId()
        self.db.mentorRequests.docs = [{"_id": request_id, "teamId": str(team_id)}]
        self.db.teams.docs = [{"_id": team_id, "status": "Looking for Mentor"}]
        self.user = {"sub": self.owner_id, "id": self.owner_id, "role": "mentor", "name": "Test Mentor"}

        response = self.client.patch(f"/teams/mentor/requests/{request_id}", json={"decision": "approved"})

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.db.mentorRequests.docs[0]["status"], "approved")
        self.assertEqual(self.db.teams.docs[0]["mentorId"], self.owner_id)

    def test_decided_request_cannot_be_overwritten(self):
        request_id = ObjectId()
        self.db.mentorRequests.docs = [{"_id": request_id, "mentorId": self.owner_id, "status": "approved"}]
        self.user = {"sub": self.owner_id, "id": self.owner_id, "role": "mentor"}

        response = self.client.patch(f"/mentor/requests/{request_id}", json={"decision": "rejected"})

        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.db.mentorRequests.docs[0]["status"], "approved")
        self.assertEqual(self.db.mentorRequests.updates, [])

    def test_unknown_request_id_does_not_treat_team_as_request(self):
        team_id = ObjectId()
        self.db.teams.docs = [{"_id": team_id, "status": "Active"}]
        self.user = {"sub": self.owner_id, "id": self.owner_id, "role": "mentor"}

        response = self.client.patch(f"/teams/mentor/requests/{team_id}", json={"decision": "approved"})

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.db.mentorRequests.docs, [])
        self.assertEqual(self.db.mentorRequests.updates, [])
        self.assertNotIn("mentorId", self.db.teams.docs[0])

    def test_approval_does_not_replace_another_team_mentor(self):
        request_id, team_id = ObjectId(), ObjectId()
        self.db.mentorRequests.docs = [{"_id": request_id, "mentorId": self.owner_id, "teamId": str(team_id), "status": "pending"}]
        self.db.teams.docs = [{"_id": team_id, "mentorId": self.other_id, "mentorName": "Existing mentor"}]
        self.user = {"sub": self.owner_id, "id": self.owner_id, "role": "mentor"}

        response = self.client.patch(f"/teams/mentor/requests/{request_id}", json={"decision": "approved"})

        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.db.mentorRequests.docs[0]["status"], "pending")
        self.assertEqual(self.db.teams.docs[0]["mentorId"], self.other_id)

    def test_mentor_assignment_does_not_replace_an_existing_team_mentor(self):
        team_id = ObjectId()
        self.db.teams.docs = [{"_id": team_id, "mentorId": self.other_id, "mentorName": "Existing mentor"}]
        self.user = {"sub": self.owner_id, "id": self.owner_id, "role": "mentor"}

        response = self.client.post(f"/teams/{team_id}/request-mentor")

        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.db.teams.docs[0]["mentorId"], self.other_id)
        self.assertEqual(self.db.inbox.docs, [])

    def test_mentor_request_list_does_not_invent_decisionable_requests(self):
        self.db.teams.docs = [{"_id": ObjectId(), "teamName": "Existing active team", "status": "Active"}]
        self.user = {"sub": self.owner_id, "id": self.owner_id, "role": "mentor"}

        response = self.client.get("/teams/mentor/requests")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])
        self.assertEqual(self.db.mentorRequests.docs, [])


if __name__ == "__main__":
    unittest.main()
