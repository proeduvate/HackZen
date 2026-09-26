# Task: Fix Manage Hackathon showing wrong data

## Root Cause
The backend `HackathonResponse` schema did not include an `id` field, so the
MyHackathons API returned hackathons without IDs. Clicking "Manage" navigated
to `/organizer/hackathons/undefined/manage`, which failed to load.

## Steps
- [x] 1. Add `id` field to `HackathonResponse` in `backend/schemas/hackathonSchema.py`
- [x] 2. Defensive guard already present in `ManageHackathon.jsx` for missing hackathon ID
- [x] 3. Verified backend returns `id` in MyHackathons response
- [x] 4. Verified single hackathon GET endpoint works with valid id
