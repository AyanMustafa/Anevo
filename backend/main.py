from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from config import settings
from routers import auth, notes
from dependencies import get_current_user

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title='Anevo Notes API',
    description='A collaborative note-taking application API',
    version='1.0.0'
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Include routers
app.include_router(auth.router)
app.include_router(notes.router)

@app.get('/test-auth')
async def test_auth(current_user = Depends(get_current_user)):
    """Test endpoint to verify authentication is working"""
    return {
        'message': 'Authentication working!',
        'user': {
            'id': current_user.id,
            'email': current_user.email,
            'username': current_user.username
        }
    }

@app.get('/')
async def root():
    return {
        'message': 'Welcome to Anevo Notes API',
        'version': '1.0.0',
        'docs': '/docs'
    }

@app.get('/health')
async def health_check():
    return {'status': 'healthy'}

