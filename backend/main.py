from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, Session, relationship
import os
import json

# Google token verification
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

# ==========================================
#  CONFIGURATION
# ==========================================
SECRET_KEY = os.environ.get("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")

app = FastAPI()

# Allow React frontend to connect from multiple origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
#  DATABASE SETUP (SQLite)
# ==========================================
DATABASE_URL = "sqlite:///./notes.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    notes = relationship("Note", back_populates="owner", cascade="all, delete-orphan")
    shared_with_me = relationship("SharedNote", foreign_keys="SharedNote.shared_with_user_id", back_populates="shared_with_user")

class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(String, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="notes")
    shared_instances = relationship("SharedNote", back_populates="note", cascade="all, delete-orphan")

class SharedNote(Base):
    __tablename__ = "shared_notes"
    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    shared_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shared_with_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shared_at = Column(DateTime, default=datetime.utcnow)
    can_edit = Column(Integer, default=0)  # 0 = read-only, 1 = can edit
    
    note = relationship("Note", back_populates="shared_instances")
    shared_with_user = relationship("User", foreign_keys=[shared_with_user_id], back_populates="shared_with_me")

# Create all tables
Base.metadata.create_all(bind=engine)

# ==========================================
#  PYDANTIC MODELS
# ==========================================
class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str

class NoteRequest(BaseModel):
    title: str
    content: str
    tags: List[str] = []

class NoteUpdateRequest(BaseModel):
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

class NotesListResponse(BaseModel):
    notes: List[NoteResponse]

class MessageResponse(BaseModel):
    message: str

class GoogleAuthRequest(BaseModel):
    id_token: str

class ShareNoteRequest(BaseModel):
    username: str  # Changed from email to username
    can_edit: bool = False

class ShareNoteResponse(BaseModel):
    message: str
    shared_with: str

# ==========================================
#  HELPER FUNCTIONS
# ==========================================
def create_token(username: str):
    payload = {
        "sub": username,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def verify_google_token(token: str):
    try:
        if GOOGLE_CLIENT_ID:
            idinfo = id_token.verify_oauth2_token(
                token, grequests.Request(), GOOGLE_CLIENT_ID
            )
        else:
            idinfo = id_token.verify_oauth2_token(token, grequests.Request())
        return idinfo
    except Exception as e:
        print(f"Google token verification error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
#  AUTH ENDPOINTS
# ==========================================
@app.post("/register", response_model=MessageResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == req.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user = User(username=req.username, password=req.password)
    db.add(user)
    db.commit()
    return {"message": "User registered successfully"}

@app.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or user.password != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user.username)
    return {"token": token}

@app.post("/auth/google", response_model=TokenResponse)
def auth_google(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    idinfo = verify_google_token(req.id_token)
    email = idinfo.get("email")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not found in Google token")
    
    user = db.query(User).filter(User.username == email).first()
    if not user:
        user = User(username=email, password="google_oauth_user")
        db.add(user)
        db.commit()
        db.refresh(user)
    
    token = create_token(user.username)
    return {"token": token}

# ==========================================
#  NOTES ENDPOINTS
# ==========================================
@app.get("/notes", response_model=NotesListResponse)
def get_notes(token: str, db: Session = Depends(get_db)):
    username = verify_token(token)
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    notes = []
    for note in user.notes:
        try:
            tags = json.loads(note.tags) if note.tags else []
        except:
            tags = []
        
        notes.append(NoteResponse(
            id=note.id,
            title=note.title,
            content=note.content,
            tags=tags,
            lastEdited=note.updated_at.isoformat() if note.updated_at else note.created_at.isoformat(),
            owner=user.username,
            isShared=False,
            canEdit=True
        ))
    
    return {"notes": notes}

@app.get("/notes/shared", response_model=NotesListResponse)
def get_shared_notes(token: str, db: Session = Depends(get_db)):
    username = verify_token(token)
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    notes = []
    for shared in user.shared_with_me:
        note = shared.note
        try:
            tags = json.loads(note.tags) if note.tags else []
        except:
            tags = []
        
        notes.append(NoteResponse(
            id=note.id,
            title=note.title,
            content=note.content,
            tags=tags,
            lastEdited=note.updated_at.isoformat() if note.updated_at else note.created_at.isoformat(),
            owner=note.owner.username,
            isShared=True,
            canEdit=bool(shared.can_edit)
        ))
    
    return {"notes": notes}

@app.post("/notes", response_model=MessageResponse)
def create_note(note: NoteRequest, token: str, db: Session = Depends(get_db)):
    username = verify_token(token)
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_note = Note(
        title=note.title,
        content=note.content,
        tags=json.dumps(note.tags),
        user_id=user.id
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    
    return {"message": f"Note created with ID: {new_note.id}"}

@app.put("/notes/{note_id}", response_model=MessageResponse)
def update_note(note_id: int, note: NoteUpdateRequest, token: str, db: Session = Depends(get_db)):
    username = verify_token(token)
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user owns the note
    db_note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    
    # If not owner, check if they have edit permission on shared note
    if not db_note:
        shared = db.query(SharedNote).filter(
            SharedNote.note_id == note_id,
            SharedNote.shared_with_user_id == user.id,
            SharedNote.can_edit == 1
        ).first()
        
        if not shared:
            raise HTTPException(status_code=403, detail="You don't have permission to edit this note")
        
        db_note = shared.note
    
    if note.title is not None:
        db_note.title = note.title
    if note.content is not None:
        db_note.content = note.content
    if note.tags is not None:
        db_note.tags = json.dumps(note.tags)
    
    db_note.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Note updated successfully"}

@app.delete("/notes/{note_id}", response_model=MessageResponse)
def delete_note(note_id: int, token: str, db: Session = Depends(get_db)):
    username = verify_token(token)
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found or you don't own it")
    
    db.delete(db_note)
    db.commit()
    
    return {"message": "Note deleted successfully"}

@app.post("/notes/{note_id}/share", response_model=ShareNoteResponse)
def share_note(note_id: int, share_req: ShareNoteRequest, token: str, db: Session = Depends(get_db)):
    username = verify_token(token)
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user owns the note
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found or you don't own it")
    
    # Find the user to share with by username
    share_with_user = db.query(User).filter(User.username == share_req.username).first()
    if not share_with_user:
        raise HTTPException(status_code=404, detail=f"User '{share_req.username}' not found in the system")
    
    # Check if user is trying to share with themselves
    if share_with_user.id == user.id:
        raise HTTPException(status_code=400, detail="You cannot share a note with yourself")
    
    # Check if already shared
    existing_share = db.query(SharedNote).filter(
        SharedNote.note_id == note_id,
        SharedNote.shared_with_user_id == share_with_user.id
    ).first()
    
    if existing_share:
        # Update permissions
        existing_share.can_edit = 1 if share_req.can_edit else 0
        db.commit()
        return {"message": "Share permissions updated", "shared_with": share_req.username}
    
    # Create new share
    shared_note = SharedNote(
        note_id=note_id,
        shared_by_user_id=user.id,
        shared_with_user_id=share_with_user.id,
        can_edit=1 if share_req.can_edit else 0
    )
    db.add(shared_note)
    db.commit()
    
    return {"message": "Note shared successfully", "shared_with": share_req.username}

@app.delete("/notes/{note_id}/share/{username}", response_model=MessageResponse)
def unshare_note(note_id: int, username: str, token: str, db: Session = Depends(get_db)):
    current_username = verify_token(token)
    user = db.query(User).filter(User.username == current_username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user owns the note
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found or you don't own it")
    
    # Find the shared user
    shared_user = db.query(User).filter(User.username == username).first()
    if not shared_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete the share
    shared = db.query(SharedNote).filter(
        SharedNote.note_id == note_id,
        SharedNote.shared_with_user_id == shared_user.id
    ).first()
    
    if not shared:
        raise HTTPException(status_code=404, detail="This note is not shared with that user")
    
    db.delete(shared)
    db.commit()
    
    return {"message": "Note unshared successfully"}

# ==========================================
#  WEBSOCKET (OPTIONAL)
# ==========================================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        print("WebSocket client disconnected")

# ==========================================
#  HEALTH CHECK
# ==========================================
@app.get("/")
def health_check():
    return {"status": "ok", "message": "Note sharing API is running"}
