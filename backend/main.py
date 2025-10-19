from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import sessionmaker, declarative_base, Session, relationship
import os
import json

# Google token verification
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# ==========================================
#  CONFIGURATION
# ==========================================
SECRET_KEY = os.environ.get("SECRET_KEY", "supersecretkey-change-this-in-production")
ALGORITHM = "HS256"
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()

# CORS Configuration - Allow ALL origins for testing
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

# Update your User model to support both auth methods
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    google_id = Column(String, unique=True, nullable=True)
    auth_provider = Column(String, default="local")
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
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
    can_edit = Column(Integer, default=0)
    
    note = relationship("Note", back_populates="shared_instances")
    shared_with_user = relationship("User", foreign_keys=[shared_with_user_id], back_populates="shared_with_me")

# Create all tables
Base.metadata.create_all(bind=engine)

# ==========================================
#  PYDANTIC MODELS
# ==========================================
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    identifier: str  # Can be either email or username
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

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
    token: str

class ShareNoteRequest(BaseModel):
    username: str
    can_edit: bool = False

class ShareNoteResponse(BaseModel):
    message: str
    shared_with: str

# ==========================================
#  HELPER FUNCTIONS
# ==========================================
def get_password_hash(password: str) -> str:
    # Truncate password to 72 bytes (bcrypt limitation)
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Truncate password to 72 bytes (bcrypt limitation)
    if len(plain_password.encode('utf-8')) > 72:
        plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

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
                token, google_requests.Request(), GOOGLE_CLIENT_ID
            )
        else:
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request())
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
@app.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        # Validate password length
        if len(user.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        
        if len(user.password) > 72:
            raise HTTPException(status_code=400, detail="Password cannot be longer than 72 characters")
        
        # Check if user with email already exists
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Check if username already exists
        db_user = db.query(User).filter(User.username == user.username).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Username already taken")
        
        # Create new user
        hashed_password = get_password_hash(user.password)
        new_user = User(
            email=user.email,
            username=user.username,
            name=user.name or user.username,
            hashed_password=hashed_password,
            auth_provider="local"
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Create access token
        access_token = create_access_token(data={"sub": new_user.email})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "username": new_user.username,
                "name": new_user.name
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/auth/login", response_model=TokenResponse)
async def login(user_login: UserLogin, db: Session = Depends(get_db)):
    # Check if identifier is email or username
    db_user = db.query(User).filter(
        (User.email == user_login.identifier) | 
        (User.username == user_login.identifier)
    ).first()
    
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if user is Google OAuth user (no password)
    if db_user.auth_provider == "google":
        raise HTTPException(
            status_code=400, 
            detail="This account uses Google sign-in. Please use 'Sign in with Google' button."
        )
    
    # Verify password
    if not verify_password(user_login.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create access token
    access_token = create_access_token(data={"sub": db_user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "username": db_user.username,
            "name": db_user.name
        }
    }

@app.post("/auth/google", response_model=TokenResponse)
async def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            req.token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )

        # Extract user info from Google
        email = idinfo['email']
        name = idinfo.get('name', email.split('@')[0])
        google_id = idinfo['sub']

        # Check if user exists
        db_user = db.query(User).filter(User.email == email).first()
        
        if db_user:
            # User exists - check if it's a Google OAuth user
            if db_user.auth_provider != "google":
                raise HTTPException(
                    status_code=400,
                    detail="This email is registered with username/password. Please use regular login."
                )
            
            # Update user info if changed
            db_user.name = name
            db_user.google_id = google_id
            db.commit()
            db.refresh(db_user)
        else:
            # Create new Google OAuth user
            # Generate a unique username from email
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1
            
            db_user = User(
                email=email,
                username=username,
                name=name,
                google_id=google_id,
                auth_provider="google",
                hashed_password=None
            )
            
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        
        # Create JWT token
        access_token = create_access_token(data={"sub": db_user.email})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": db_user.id,
                "email": db_user.email,
                "username": db_user.username,
                "name": db_user.name
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

# ==========================================
#  NOTES ENDPOINTS
# ==========================================
@app.get("/notes", response_model=NotesListResponse)
def get_notes(token: str, db: Session = Depends(get_db)):
    email = verify_token(token)
    user = db.query(User).filter(User.email == email).first()
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
    email = verify_token(token)
    user = db.query(User).filter(User.email == email).first()
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
    email = verify_token(token)
    user = db.query(User).filter(User.email == email).first()
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
    email = verify_token(token)
    user = db.query(User).filter(User.email == email).first()
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
    email = verify_token(token)
    user = db.query(User).filter(User.email == email).first()
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
    email = verify_token(token)
    user = db.query(User).filter(User.email == email).first()
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
    email = verify_token(token)
    user = db.query(User).filter(User.email == email).first()
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
