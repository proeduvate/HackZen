from datetime import datetime
from typing import List, Optional, Dict, Any
from bson import ObjectId
import uuid
from database import get_hackathon_collection
from models.hackathonModel import HackathonStatus, HackathonTheme
from schemas.hackathonSchema import HackathonCreate, HackathonUpdate
from services.file_upload import file_upload_service

class HackathonService:
    @staticmethod
    async def create_hackathon(
        organizer_id: str, 
        data: HackathonCreate, 
        db,
        poster: Optional[Any] = None,
        template: Optional[Any] = None
    ) -> Dict[str, Any]:
        coll = db.hackathons
        now = datetime.utcnow()
        
        # Convert Pydantic model to dict
        hackathon_dict = data.model_dump(by_alias=True, exclude_unset=True)
        
        # Handle enum serialization
        if "themes" in hackathon_dict and hackathon_dict["themes"]:
            hackathon_dict["themes"] = [
                t.value if hasattr(t, "value") else t 
                for t in hackathon_dict["themes"]
            ]

        if "status" in hackathon_dict:
            status_val = hackathon_dict["status"]
            if hasattr(status_val, "value"):
                hackathon_dict["status"] = status_val.value
            else:
                hackathon_dict["status"] = str(status_val)

        # Add metadata
        hackathon_dict.update({
            "organizerId": organizer_id,
            "createdAt": now,
            "updatedAt": now
        })
        
        # 1. Insert FIRST to get the ID
        result = await coll.insert_one(hackathon_dict)
        hackathon_id = str(result.inserted_id)
        hackathon_dict["_id"] = hackathon_id
        
        # 2. Save files using the real ID if provided
        updates = {}
        if poster and hasattr(poster, 'filename') and poster.filename:
            try:
                _, poster_url = await file_upload_service.save_poster(poster)
                print(f"DEBUG: Poster saved at: {poster_url}")
                updates["posterUrl"] = poster_url
            except Exception as e:
                print(f"DEBUG: Poster save failed: {str(e)}")
                
        if template and hasattr(template, 'filename') and template.filename:
            try:
                _, template_url = await file_upload_service.save_template(template)
                print(f"DEBUG: Template saved at: {template_url}")
                updates["templateUrl"] = template_url
            except Exception as e:
                print(f"DEBUG: Template save failed: {str(e)}")

        # 3. Update the document if files were saved
        if updates:
            await coll.update_one({"_id": result.inserted_id}, {"$set": updates})
            hackathon_dict.update(updates)
        
        print(f"DEBUG: Hackathon created successfully with ID: {hackathon_dict['_id']}")
        return hackathon_dict

    @staticmethod
    async def get_hackathon_by_id(hid: str, db) -> Optional[Dict[str, Any]]:
        coll = db.hackathons
        if not ObjectId.is_valid(hid):
            return None     
        hackathon = await coll.find_one({"_id": ObjectId(hid)})
        if hackathon:
            hackathon["_id"] = str(hackathon["_id"])
        return hackathon

    @staticmethod
    async def get_all_hackathons(db, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        coll = db.hackathons
        query = filters or {}
        
        cursor = coll.find(query).sort("createdAt", -1)
        hackathons = await cursor.to_list(100)
        
        for h in hackathons:
            h["_id"] = str(h["_id"])
            # Add participant count
            h["participants_count"] = await db.applications.count_documents({"hackathonId": h["_id"]})
        return hackathons

    @staticmethod
    async def update_hackathon(
        hid: str, 
        organizer_id: str, 
        user_role: str, 
        data: HackathonUpdate, 
        db,
        poster: Optional[Any] = None,
        template: Optional[Any] = None
    ) -> Optional[Dict[str, Any]]:
        coll = db.hackathons
        
        if not ObjectId.is_valid(hid):
            return None

        query = {"_id": ObjectId(hid)}
            
        # Verify ownership
        existing = await coll.find_one(query)
        if not existing:
            return None
        
        # Allow if it's the owner OR an admin
        if existing["organizerId"] != organizer_id and user_role != "admin":
            raise PermissionError("Not authorized to update this hackathon")

            
        update_data = data.model_dump(exclude_unset=True, by_alias=True)
        
        # --- MongoDB Serialization for Updates ---
        if "themes" in update_data and update_data["themes"]:
            update_data["themes"] = [t.value if hasattr(t, "value") else t for t in update_data["themes"]]

        if "status" in update_data:
            status_val = update_data["status"]
            if hasattr(status_val, "value"):
                status_val = status_val.value
                
            if str(status_val).lower() in ["open", "registration_open", "registration open"]:
                update_data["status"] = HackathonStatus.REGISTRATION_OPEN.value
            else:
                update_data["status"] = status_val
        
        # Save files if provided
        if poster and hasattr(poster, 'filename') and poster.filename:
            try:
                _, poster_url = await file_upload_service.save_poster(poster)
                update_data["posterUrl"] = poster_url
            except Exception as e:
                print(f"DEBUG (SERVICE ERROR): Poster save failed: {str(e)}")
                
        if template and hasattr(template, 'filename') and template.filename:
            try:
                _, template_url = await file_upload_service.save_template(template)
                update_data["templateUrl"] = template_url
            except Exception as e:
                print(f"DEBUG (SERVICE ERROR): Template save failed: {str(e)}")

        update_data["updatedAt"] = datetime.utcnow()
        
        await coll.update_one(query, {"$set": update_data})
        return await HackathonService.get_hackathon_by_id(hid, db)

    @staticmethod
    async def delete_hackathon(hid: str, organizer_id: str, user_role: str, db) -> bool:
        coll = db.hackathons
        
        if not ObjectId.is_valid(hid):
            return False

        query = {"_id": ObjectId(hid)}
            
        existing = await coll.find_one(query)
        if not existing:
            return False
            
        # Allow if it's the owner OR an admin
        if existing["organizerId"] != organizer_id and user_role != "admin":
            raise PermissionError("Not authorized to delete this hackathon")
            
        await coll.delete_one(query)
        return True

    @staticmethod
    async def get_organizer_hackathons(organizer_id: str, db) -> List[Dict[str, Any]]:
        coll = db.hackathons
        cursor = coll.find({"organizerId": organizer_id}).sort("createdAt", -1)
        hackathons = await cursor.to_list(100)
        
        for h in hackathons:
            h["_id"] = str(h["_id"])
        return hackathons
