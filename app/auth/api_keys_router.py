import secrets
import hashlib
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime

from app.core.config import supabase
from app.auth.middleware import get_current_user_id

router = APIRouter()

class APIKeyCreate(BaseModel):
    name: str

class APIKeyResponse(BaseModel):
    id: str
    name: str
    prefix: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    is_active: bool
    key: Optional[str] = None

@router.post("/", response_model=APIKeyResponse)
def create_api_key(request: Request, payload: APIKeyCreate):
    """Create a new developer API Key for programmatic access."""
    user_id = get_current_user_id(request)
    
    raw_token = "msk_" + secrets.token_urlsafe(32)
    prefix = raw_token[:8]
    key_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    
    result = supabase.table("api_keys").insert({
        "user_id": user_id,
        "name": payload.name,
        "key_hash": key_hash,
        "prefix": prefix,
    }).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create API key")
        
    data = result.data[0]
    data["key"] = raw_token  # ONLY show raw_token to the user during creation
    return data

@router.get("/", response_model=List[APIKeyResponse])
def list_api_keys(request: Request):
    """List all API keys belonging to the current user."""
    user_id = get_current_user_id(request)
    result = supabase.table("api_keys").select("id, name, prefix, created_at, last_used_at, is_active").eq("user_id", user_id).execute()
    return result.data

@router.delete("/{key_id}")
def delete_api_key(request: Request, key_id: str):
    """Permanently revoke and delete an API key."""
    user_id = get_current_user_id(request)
    result = supabase.table("api_keys").delete().eq("id", key_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="API Key not found")
    return {"status": "deleted"}
