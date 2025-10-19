from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
import schemas
import models
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/notes", tags=["notes"])

@router.get("", response_model=List[schemas.NoteResponse])
async def get_notes(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all notes owned by the current user"""
    notes = []
    for note in current_user.notes:
        try:
            tags = json.loads(note.tags) if note.tags else []
        except:
            tags = []
        
        # Get list of users this note is shared with
        shared_with = []
        for shared in note.shared_instances:
            shared_user = db.query(models.User).filter(models.User.id == shared.shared_with_user_id).first()
            if shared_user:
                shared_with.append(shared_user.username)
        
        notes.append(schemas.NoteResponse(
            id=note.id,
            title=note.title,
            content=note.content,
            tags=tags,
            lastEdited=note.updated_at.isoformat() if note.updated_at else note.created_at.isoformat(),
            owner=current_user.username,
            isShared=False,
            canEdit=True,
            sharedWith=shared_with
        ))
    
    return notes

@router.get("/shared", response_model=List[schemas.NoteResponse])
async def get_shared_notes(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all notes shared with the current user"""
    notes = []
    for shared in current_user.shared_with_me:
        note = shared.note
        try:
            tags = json.loads(note.tags) if note.tags else []
        except:
            tags = []
        
        notes.append(schemas.NoteResponse(
            id=note.id,
            title=note.title,
            content=note.content,
            tags=tags,
            lastEdited=note.updated_at.isoformat() if note.updated_at else note.created_at.isoformat(),
            owner=note.owner.username,
            isShared=True,
            canEdit=bool(shared.can_edit)
        ))
    
    return notes

@router.post("", response_model=schemas.MessageResponse)
async def create_note(
    note: schemas.NoteCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new note"""
    new_note = models.Note(
        title=note.title,
        content=note.content,
        tags=json.dumps(note.tags),
        user_id=current_user.id
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    
    return {"message": f"Note created with ID: {new_note.id}"}

@router.put("/{note_id}", response_model=schemas.MessageResponse)
async def update_note(
    note_id: int,
    note: schemas.NoteUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a note"""
    # Check if user owns the note
    db_note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.user_id == current_user.id
    ).first()
    
    # If not owner, check if they have edit permission on shared note
    if not db_note:
        shared = db.query(models.SharedNote).filter(
            models.SharedNote.note_id == note_id,
            models.SharedNote.shared_with_user_id == current_user.id,
            models.SharedNote.can_edit == 1
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
    
    from datetime import datetime
    db_note.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Note updated successfully"}

@router.delete("/{note_id}", response_model=schemas.MessageResponse)
async def delete_note(
    note_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a note (only owner can delete)"""
    db_note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.user_id == current_user.id
    ).first()
    
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found or you don't own it")
    
    db.delete(db_note)
    db.commit()
    
    return {"message": "Note deleted successfully"}

@router.post("/{note_id}/share", response_model=schemas.ShareNoteResponse)
async def share_note(
    note_id: int,
    share_req: schemas.ShareNoteRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Share a note with another user"""
    # Check if user owns the note
    note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.user_id == current_user.id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found or you don't own it")
    
    # Find the user to share with by username
    share_with_user = db.query(models.User).filter(
        models.User.username == share_req.username
    ).first()
    
    if not share_with_user:
        raise HTTPException(status_code=404, detail=f"User '{share_req.username}' not found in the system")
    
    # Check if user is trying to share with themselves
    if share_with_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot share a note with yourself")
    
    # Check if already shared
    existing_share = db.query(models.SharedNote).filter(
        models.SharedNote.note_id == note_id,
        models.SharedNote.shared_with_user_id == share_with_user.id
    ).first()
    
    if existing_share:
        # Update permissions
        existing_share.can_edit = 1 if share_req.can_edit else 0
        db.commit()
        return {"message": "Share permissions updated", "shared_with": share_req.username}
    
    # Create new share
    shared_note = models.SharedNote(
        note_id=note_id,
        shared_by_user_id=current_user.id,
        shared_with_user_id=share_with_user.id,
        can_edit=1 if share_req.can_edit else 0
    )
    db.add(shared_note)
    db.commit()
    
    return {"message": "Note shared successfully", "shared_with": share_req.username}

@router.delete("/{note_id}/share/{username}", response_model=schemas.MessageResponse)
async def unshare_note(
    note_id: int,
    username: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove sharing access from a user"""
    # Check if user owns the note
    note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.user_id == current_user.id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found or you don't own it")
    
    # Find the shared user
    shared_user = db.query(models.User).filter(models.User.username == username).first()
    if not shared_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete the share
    shared = db.query(models.SharedNote).filter(
        models.SharedNote.note_id == note_id,
        models.SharedNote.shared_with_user_id == shared_user.id
    ).first()
    
    if not shared:
        raise HTTPException(status_code=404, detail="This note is not shared with that user")
    
    db.delete(shared)
    db.commit()
    
    return {"message": "Note unshared successfully"}

