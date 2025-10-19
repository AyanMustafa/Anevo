# Backend Refactoring - New Structure

## 📁 File Structure

```
backend/
├── main.py                  # Main FastAPI application (simplified)
├── config.py                # Configuration and settings
├── database.py              # Database setup and connection
├── models.py                # SQLAlchemy database models
├── schemas.py               # Pydantic schemas for validation
├── auth.py                  # Authentication logic (JWT, password hashing)
├── dependencies.py          # Common dependencies (get_current_user)
├── routers/                 # API route handlers
│   ├── __init__.py
│   ├── auth.py             # Authentication endpoints (/auth/*)
│   ├── notes.py            # Notes CRUD endpoints (/notes/*)
│   └── share.py            # Sharing endpoints (/notes/{id}/share)
├── .env                     # Environment variables
├── notes.db                 # SQLite database
└── main.py.old             # Previous monolithic version (backup)
```

## 🔧 What Changed

### Before (Monolithic)

- ❌ Single 589-line `main.py` file
- ❌ All code in one place
- ❌ Hard to maintain and test
- ❌ Difficult to find specific functionality

### After (Modular)

- ✅ Code split into 11 organized files
- ✅ Each file has a single responsibility
- ✅ Easy to maintain and test
- ✅ Clear separation of concerns

## 📄 File Descriptions

### `main.py` (43 lines)

- **Purpose**: Entry point for the FastAPI application
- **Contains**: App initialization, CORS setup, router registration
- **Routes**:
  - `GET /` - Welcome message
  - `GET /health` - Health check

### `config.py`

- **Purpose**: Centralized configuration management
- **Contains**: Settings class with all environment variables
- **Settings**:
  - `DATABASE_URL` - Database connection string
  - `SECRET_KEY` - JWT secret key
  - `ALGORITHM` - JWT algorithm
  - `GOOGLE_CLIENT_ID` - Google OAuth client ID
  - `ALLOWED_ORIGINS` - CORS allowed origins

### `database.py`

- **Purpose**: Database connection and session management
- **Contains**:
  - SQLAlchemy engine creation
  - Session maker
  - Base declarative class
  - `get_db()` dependency function

### `models.py`

- **Purpose**: Database table definitions
- **Contains**:
  - `User` model - User accounts
  - `Note` model - Notes with owner relationship
  - `SharedNote` model - Note sharing with permissions

### `schemas.py`

- **Purpose**: Request/response validation schemas
- **Contains**:
  - User schemas (UserCreate, UserLogin, User)
  - Token schemas (Token)
  - Note schemas (NoteCreate, NoteUpdate, Note, NoteWithOwner)
  - Share schemas (ShareNoteRequest, SharedNoteInfo)
  - Google Auth schemas (GoogleAuthRequest)

### `auth.py`

- **Purpose**: Authentication helper functions
- **Contains**:
  - `verify_password()` - Password verification
  - `get_password_hash()` - Password hashing
  - `create_access_token()` - JWT token creation
  - `decode_token()` - JWT token decoding

### `dependencies.py`

- **Purpose**: Reusable dependencies for routes
- **Contains**:
  - `get_current_user()` - Extract user from JWT token

### `routers/auth.py`

- **Purpose**: Authentication API endpoints
- **Routes**:
  - `POST /auth/register` - User registration
  - `POST /auth/login` - User login
  - `POST /auth/google` - Google OAuth login

### `routers/notes.py`

- **Purpose**: Notes CRUD API endpoints
- **Routes**:
  - `POST /notes` - Create note
  - `GET /notes` - Get all user's notes (owned + shared)
  - `GET /notes/{note_id}` - Get specific note
  - `PUT /notes/{note_id}` - Update note
  - `DELETE /notes/{note_id}` - Delete note

### `routers/share.py`

- **Purpose**: Note sharing API endpoints
- **Routes**:
  - `POST /notes/{note_id}/share` - Share note with user
  - `GET /notes/{note_id}/shares` - Get list of shared users
  - `DELETE /notes/{note_id}/share/{user_id}` - Unshare note

## 🚀 Running the Application

### 1. Install Dependencies

```bash
cd backend
pip install pydantic-settings
```

### 2. Start the Server

```bash
uvicorn main:app --reload
```

### 3. Access the API

- **API**: http://127.0.0.1:8000
- **Interactive Docs**: http://127.0.0.1:8000/docs
- **Alternative Docs**: http://127.0.0.1:8000/redoc

## ✅ Benefits

1. **Modularity**: Each file has a clear, single purpose
2. **Maintainability**: Easy to find and modify specific functionality
3. **Scalability**: Simple to add new features by creating new router files
4. **Testability**: Each module can be tested independently
5. **Readability**: Code is organized logically and easier to understand
6. **Reusability**: Common functions are centralized and reusable
7. **Team Collaboration**: Multiple developers can work on different files

## 📝 Adding New Features

### To add a new endpoint:

1. Create a new router file in `routers/` directory
2. Define your routes using `APIRouter`
3. Import and register the router in `main.py`

Example:

```python
# routers/new_feature.py
from fastapi import APIRouter
router = APIRouter(prefix="/feature", tags=["feature"])

@router.get("/")
async def get_feature():
    return {"message": "New feature"}

# main.py
from routers import new_feature
app.include_router(new_feature.router)
```

## 🔄 Migration Notes

- ✅ All functionality from old `main.py` is preserved
- ✅ Database remains unchanged (notes.db)
- ✅ API endpoints remain the same
- ✅ Frontend requires no changes
- ✅ Old file backed up as `main.py.old`

## 🎯 Next Steps

Consider adding:

- [ ] Unit tests for each module
- [ ] API rate limiting
- [ ] Logging configuration
- [ ] Database migrations (Alembic)
- [ ] Docker containerization
- [ ] API versioning
- [ ] Comprehensive error handling middleware
