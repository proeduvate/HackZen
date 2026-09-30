"""
File upload utilities for hackathons, team materials, posters, and submissions
"""

import os
import shutil
import uuid
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from fastapi import UploadFile, HTTPException

from core.config import settings


class FileUploadService:
    def __init__(self):
        # Get absolute path for uploads directory
        backend_dir = Path(__file__).parent.parent.resolve()
        self.base_dir = backend_dir / "uploads"
        self.posters_dir = self.base_dir / "posters"
        self.templates_dir = self.base_dir / "templates"
        self.materials_dir = self.base_dir / "materials"

        # Create directories
        self.posters_dir.mkdir(parents=True, exist_ok=True)
        self.templates_dir.mkdir(parents=True, exist_ok=True)
        self.materials_dir.mkdir(parents=True, exist_ok=True)

    async def save_poster(self, file: UploadFile) -> tuple:
        """Save hackathon poster image"""
        allowed_types = [".jpg", ".jpeg", ".png", ".webp"]
        path = await self._save_file(file, self.posters_dir, allowed_types)
        url = self.get_file_url(path)
        return (path, url)

    async def save_template(self, file: UploadFile) -> tuple:
        """Save hackathon presentation template"""
        allowed_types = [".zip", ".ppt", ".pptx", ".pdf", ".doc", ".docx"]
        path = await self._save_file(file, self.templates_dir, allowed_types)
        url = self.get_file_url(path)
        return (path, url)

    async def save_submission_file(
        self, file: UploadFile, hackathon_id: str, team_id: str
    ) -> str:
        """Save hackathon project submission file"""
        # Validate file type
        allowed_types = [
            ".zip",
            ".rar",
            ".tar",
            ".gz",
            ".7z",
            ".pdf",
            ".doc",
            ".docx",
            ".ppt",
            ".pptx",
        ]

        # Use a submissions directory
        submissions_dir = self.base_dir / "submissions"
        submissions_dir.mkdir(parents=True, exist_ok=True)

        # Get file extension
        filename = file.filename or ""
        file_ext = os.path.splitext(filename)[1].lower()

        # Validate file type
        if file_ext not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}",
            )

        # Validate file size
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        max_size = getattr(settings, "MAX_UPLOAD_SIZE", 25 * 1024 * 1024)
        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {max_size // (1024 * 1024)}MB",
            )

        # Create hackathon/team specific directory
        target_dir = submissions_dir / hackathon_id / team_id
        target_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique filename
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = target_dir / unique_filename

        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Return relative path
        return f"submissions/{hackathon_id}/{team_id}/{unique_filename}"

    async def save_team_material(
        self, file: UploadFile, team_id: str
    ) -> Dict[str, Any]:
        """Save team material file with security, validation, and metadata generation"""
        allowed_extensions = {
            # Documents & Presentations
            ".pdf", ".ppt", ".pptx", ".doc", ".docx", ".txt", ".rtf", ".md", ".key",
            # Spreadsheets & Data
            ".xls", ".xlsx", ".csv", ".json",
            # Design & Media
            ".fig", ".sketch", ".xd", ".psd", ".ai", ".svg", ".jpg", ".jpeg", ".png", ".webp", ".gif",
            # Videos & Audio
            ".mp4", ".mov", ".webm", ".avi", ".mkv", ".mp3", ".wav",
            # Archives & Code
            ".zip", ".rar", ".7z", ".tar", ".gz", ".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css"
        }

        filename = os.path.basename(file.filename or "untitled_file").replace("\x00", "")
        file_ext = os.path.splitext(filename)[1].lower()

        if not file_ext or file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{file_ext}'. Please upload standard documents, presentations, archives, design, or media files."
            )

        content = await file.read()
        file_size = len(content)

        max_size = 25 * 1024 * 1024  # 25 MB max
        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum allowed size of 25 MB (uploaded: {file_size / (1024 * 1024):.1f} MB)"
            )

        if file_size == 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot upload an empty file."
            )

        # Team specific directory inside materials
        team_materials_dir = self.materials_dir / team_id
        team_materials_dir.mkdir(parents=True, exist_ok=True)

        stored_filename = f"{uuid.uuid4().hex}{file_ext}"
        full_dest_path = team_materials_dir / stored_filename

        with open(full_dest_path, "wb") as buffer:
            buffer.write(content)

        # Reset file position if needed
        await file.seek(0)

        relative_storage_path = f"materials/{team_id}/{stored_filename}"
        mime_type = file.content_type or "application/octet-stream"

        # Determine category / type
        ext_clean = file_ext.lstrip(".")
        if file_ext in {".ppt", ".pptx", ".key"}:
            category = "Presentation"
            type_label = "pptx" if file_ext == ".pptx" else "ppt"
        elif file_ext in {".pdf", ".doc", ".docx", ".txt", ".rtf", ".md"}:
            category = "Documentation"
            type_label = "pdf" if file_ext == ".pdf" else "doc"
        elif file_ext in {".fig", ".sketch", ".xd", ".psd", ".ai"}:
            category = "Design"
            type_label = "fig" if file_ext == ".fig" else "design"
        elif file_ext in {".zip", ".rar", ".7z", ".tar", ".gz"}:
            category = "Code & Archives"
            type_label = "zip" if file_ext == ".zip" else "archive"
        elif file_ext in {".mp4", ".mov", ".webm", ".avi", ".mkv"}:
            category = "Demo Video"
            type_label = "mp4" if file_ext == ".mp4" else "video"
        elif file_ext in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}:
            category = "Image"
            type_label = ext_clean
        else:
            category = "General"
            type_label = ext_clean

        return {
            "originalName": filename,
            "storedName": stored_filename,
            "storagePath": relative_storage_path,
            "fullPath": str(full_dest_path),
            "size": file_size,
            "mimeType": mime_type,
            "extension": file_ext,
            "type": type_label,
            "defaultCategory": category,
        }

    async def _save_file(
        self, file: UploadFile, directory: Path, allowed_types: list
    ) -> str:
        """Save uploaded file with validation"""
        # Get file extension
        filename = file.filename or ""
        file_ext = os.path.splitext(filename)[1].lower()

        # Generate unique filename
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = directory / unique_filename

        # Save file
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)

        # Reset file pointer in case it's needed elsewhere
        await file.seek(0)

        # Return relative path from uploads directory
        relative_path = f"{directory.name}/{unique_filename}"
        return relative_path

    def get_file_url(self, file_path: str) -> str:
        """Convert file path to full absolute URL"""
        if not file_path:
            return ""
        base_url = settings.BACKEND_URL.rstrip("/")
        if not base_url.startswith("http"):
            base_url = f"http://{base_url}"
        return f"{base_url}/uploads/{file_path}"

    def get_full_path(self, relative_path: str) -> Path:
        """Get absolute Path object for a relative uploads path"""
        return self.base_dir / relative_path

    def delete_file(self, file_path: str) -> bool:
        """Delete uploaded file from disk safely"""
        if not file_path:
            return False

        full_path = self.base_dir / file_path
        try:
            # Prevent path traversal outside base_dir
            if self.base_dir.resolve() not in full_path.resolve().parents:
                return False
            if full_path.exists() and full_path.is_file():
                full_path.unlink()
                return True
        except Exception as err:
            print(f"Error deleting file {file_path}: {err}")
        return False

    def list_hackathon_files(self, hackathon_id: str) -> dict:
        """List all files uploaded for a hackathon"""
        result = {"posters": [], "templates": []}

        # List posters
        posters_dir = self.posters_dir / hackathon_id
        if posters_dir.exists():
            for file in posters_dir.iterdir():
                if file.is_file():
                    result["posters"].append(
                        {
                            "filename": file.name,
                            "path": f"posters/{hackathon_id}/{file.name}",
                            "url": f"/uploads/posters/{hackathon_id}/{file.name}",
                            "size": file.stat().st_size,
                        }
                    )

        # List templates
        templates_dir = self.templates_dir / hackathon_id
        if templates_dir.exists():
            for file in templates_dir.iterdir():
                if file.is_file():
                    result["templates"].append(
                        {
                            "filename": file.name,
                            "path": f"templates/{hackathon_id}/{file.name}",
                            "url": f"/uploads/templates/{hackathon_id}/{file.name}",
                            "size": file.stat().st_size,
                        }
                    )

        return result


# Singleton instance
file_upload_service = FileUploadService()
