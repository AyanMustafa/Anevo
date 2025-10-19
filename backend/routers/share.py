from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import schemas
import models
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/notes", tags=["sharing"])

@router.post("/{note_id}/share")
async def share_note(
    note_id: int,
    share_request: schemas.ShareNoteRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Share a note with another user"""
    # Get the note
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can share this note")
    
    # Find user to share with
    user_to_share = db.query(models.User).filter(models.User.email == share_request.email).first()
    
    if not user_to_share:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_to_share.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot share note with yourself")
    
    # Check if already shared
    existing_share = db.query(models.SharedNote).filter(
        models.SharedNote.note_id == note_id,
        models.SharedNote.shared_with_id == user_to_share.id
    ).first()
    
    if existing_share:
        # Update permissions
        existing_share.can_edit = share_request.can_edit
        db.commit()
        return {"message": "Sharing permissions updated successfully"}
    
    # Create new share
    db_share = models.SharedNote(
        note_id=note_id,
        shared_with_id=user_to_share.id,
        can_edit=share_request.can_edit
    )
    
    db.add(db_share)
    db.commit()
    
    return {"message": "Note shared successfully"}

@router.get("/{note_id}/shares", response_model=List[schemas.SharedNoteInfo])
async def get_note_shares(
    note_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of users a note is shared with"""
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can view sharing information")
    
    shares = db.query(models.SharedNote).filter(models.SharedNote.note_id == note_id).all()
    
    return shares

@router.delete("/{note_id}/share/{user_id}")
async def unshare_note(
    note_id: int,
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove sharing access from a user"""
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can unshare this note")
    
    share = db.query(models.SharedNote).filter(
        models.SharedNote.note_id == note_id,
        models.SharedNote.shared_with_id == user_id
    ).first()
    
    if not share:
        raise HTTPException(status_code=404, detail="Note is not shared with this user")
    
    db.delete(share)
    db.commit()
    
    return {"message": "Note unshared successfully"}
