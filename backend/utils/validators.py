import re
from typing import Optional
from datetime import datetime

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_password(password: str) -> tuple[bool, Optional[str]]:
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, None

def validate_team_code(code: str) -> bool:
    """Validate team code format"""
    pattern = r'^[A-Z0-9]{6,12}$'
    return bool(re.match(pattern, code))

def validate_hackathon_id(hackathon_id: str) -> bool:
    """Validate hackathon ID format"""
    pattern = r'^[A-Z]{4}\d{4,6}$'
    return bool(re.match(pattern, hackathon_id))

def validate_date_range(start_date: datetime, end_date: datetime) -> tuple[bool, Optional[str]]:
    """Validate date range"""
    if start_date >= end_date:
        return False, "End date must be after start date"
    
    if (end_date - start_date).days > 365:
        return False, "Date range cannot exceed one year"
    
    return True, None

def validate_file_extension(filename: str, allowed_extensions: list) -> bool:
    """Validate file extension"""
    return any(filename.lower().endswith(ext) for ext in allowed_extensions)

def validate_file_size(file_size: int, max_size: int) -> bool:
    """Validate file size"""
    return file_size <= max_size