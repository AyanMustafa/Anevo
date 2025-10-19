from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    identifier: str  # email or username
    password: str

class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict  # Changed to dict to match main_old.py

# Note Schemas
class NoteBase(BaseModel):
    title: str
    content: str
    tags: List[str] = []

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None

class NoteResponse(BaseModel):
    id: int
    title: str
    content: str
    tags: List[str]
    lastEdited: str
    owner: Optional[str] = None
    isShared: Optional[bool] = False
    canEdit: Optional[bool] = False

# Share Schemas
class ShareNoteRequest(BaseModel):
    username: str  # Changed from email to username to match main_old.py
    can_edit: bool = False

class ShareNoteResponse(BaseModel):
    message: str
    shared_with: str

class MessageResponse(BaseModel):
    message: str

# Google Auth Schema
class GoogleAuthRequest(BaseModel):
    token: str

