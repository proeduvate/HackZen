from datetime import datetime, timedelta
from typing import Any, Dict, List
import random
import string

def generate_random_string(length: int = 8) -> str:
    """Generate random string"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def format_datetime(dt: datetime) -> str:
    """Format datetime to human-readable string"""
    return dt.strftime("%B %d, %Y at %I:%M %p")

def calculate_time_remaining(end_time: datetime) -> Dict[str, Any]:
    """Calculate time remaining until deadline"""
    now = datetime.utcnow()
    if end_time <= now:
        return {"days": 0, "hours": 0, "minutes": 0, "seconds": 0, "is_past": True}
    
    delta = end_time - now
    days = delta.days
    hours, remainder = divmod(delta.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    
    return {
        "days": days,
        "hours": hours,
        "minutes": minutes,
        "seconds": seconds,
        "is_past": False
    }

def calculate_stage_progress(current_stage: str, total_stages: List[str]) -> Dict[str, Any]:
    """Calculate progress through hackathon stages"""
    if current_stage not in total_stages:
        return {"percentage": 0, "current_index": 0, "completed": 0}
    
    current_index = total_stages.index(current_stage)
    completed = current_index  # Assuming stages are completed sequentially
    total = len(total_stages)
    
    percentage = (completed / total) * 100 if total > 0 else 0
    
    return {
        "percentage": round(percentage, 1),
        "current_index": current_index,
        "completed": completed,
        "total": total,
        "next_stage": total_stages[current_index + 1] if current_index + 1 < total else None
    }

def validate_team_size(team_size: int, min_size: int, max_size: int) -> bool:
    """Validate team size"""
    return min_size <= team_size <= max_size

def extract_skills_from_text(text: str) -> List[str]:
    """Extract potential skills from text"""
    # Common tech skills
    common_skills = [
        "python", "javascript", "java", "c++", "c#", "ruby", "php",
        "react", "angular", "vue", "node.js", "django", "flask",
        "mongodb", "mysql", "postgresql", "redis",
        "docker", "kubernetes", "aws", "azure", "gcp",
        "machine learning", "ai", "data science", "blockchain",
        "ui/ux", "figma", "adobe xd"
    ]
    
    text_lower = text.lower()
    found_skills = []
    
    for skill in common_skills:
        if skill in text_lower:
            found_skills.append(skill)
    
    return list(set(found_skills))

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage"""
    # Remove path traversal attempts
    filename = filename.replace("../", "").replace("./", "")
    # Replace spaces and special characters
    sanitized = "".join(c for c in filename if c.isalnum() or c in "._- ")
    return sanitized[:100]  # Limit length