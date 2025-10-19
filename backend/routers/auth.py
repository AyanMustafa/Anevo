from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests
import schemas
import models
from database import get_db
from auth import verify_password, get_password_hash, create_access_token
from config import settings

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=schemas.Token)
async def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        # Validate password length
        if len(user.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        
        if len(user.password) > 72:
            raise HTTPException(status_code=400, detail="Password cannot be longer than 72 characters")
        
        # Check if user with email already exists
        db_user = db.query(models.User).filter(models.User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Check if username already exists
        db_user = db.query(models.User).filter(models.User.username == user.username).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Username already taken")
        
        # Create new user
        hashed_password = get_password_hash(user.password)
        new_user = models.User(
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
        access_token = create_access_token(data={"sub": str(new_user.id)})
        
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

@router.post("/login", response_model=schemas.Token)
async def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login with email/username and password"""
    # Find user by email or username
    user = db.query(models.User).filter(
        (models.User.email == credentials.identifier) | 
        (models.User.username == credentials.identifier)
    ).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if user is Google OAuth user (no password)
    if user.auth_provider == "google":
        raise HTTPException(
            status_code=400,
            detail="This account uses Google sign-in. Please use 'Sign in with Google' button."
        )
    
    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "name": user.name
        }
    }

@router.post("/google", response_model=schemas.Token)
async def google_auth(req: schemas.GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate with Google OAuth"""
    try:
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            req.token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        
        # Extract user info from Google
        email = idinfo['email']
        name = idinfo.get('name', email.split('@')[0])
        google_id = idinfo['sub']
        
        # Check if user exists
        db_user = db.query(models.User).filter(models.User.email == email).first()
        
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
            
            while db.query(models.User).filter(models.User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1
            
            db_user = models.User(
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
        access_token = create_access_token(data={"sub": str(db_user.id)})
        
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

