import { useState, useEffect } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export type Note = {
  id: number;
  title: string;
  content: string;
  tags: string[];
  lastEdited?: string;
  owner?: string;
  isShared?: boolean;
  canEdit?: boolean;
};

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [sharedNotes, setSharedNotes] = useState<Note[]>([]);
  const token = localStorage.getItem("token");

  const fetchNotes = async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/notes?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      } else if (res.status === 401) {
        // Token expired or invalid
        localStorage.removeItem("token");
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  const fetchSharedNotes = async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/notes/shared?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setSharedNotes(data.notes || []);
      }
    } catch (error) {
      console.error("Error fetching shared notes:", error);
    }
  };

  const addNote = async (note: Omit<Note, "id">) => {
    if (!token) {
      console.error("No token found");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/notes?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });

      if (res.ok) {
        await fetchNotes();
        return true;
      } else {
        const data = await res.json();
        console.error("Failed to add note:", data);
        return false;
      }
    } catch (error) {
      console.error("Error adding note:", error);
      return false;
    }
  };

  const deleteNote = async (id: number) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/notes/${id}?token=${token}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setNotes(notes.filter((n) => n.id !== id));
        return true;
      } else {
        console.error("Failed to delete note:", res.status);
        return false;
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      return false;
    }
  };

  const editNote = async (id: number, updates: Partial<Omit<Note, "id">>) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/notes/${id}?token=${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        await fetchNotes();
        await fetchSharedNotes();
        return true;
      } else {
        console.error("Failed to edit note:", res.status);
        return false;
      }
    } catch (error) {
      console.error("Error updating note:", error);
      return false;
    }
  };

  const shareNote = async (noteId: number, username: string, canEdit: boolean = false) => {
    if (!token) return { success: false, message: "No token found" };

    try {
      const res = await fetch(`${API_BASE_URL}/notes/${noteId}/share?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, can_edit: canEdit }),
      });

      const data = await res.json();

      if (res.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.detail || "Failed to share note" };
      }
    } catch (error) {
      console.error("Error sharing note:", error);
      return { success: false, message: "Network error" };
    }
  };

  const unshareNote = async (noteId: number, username: string) => {
    if (!token) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/notes/${noteId}/share/${username}?token=${token}`, {
        method: "DELETE",
      });

      if (res.ok) {
        return true;
      } else {
        console.error("Failed to unshare note");
        return false;
      }
    } catch (error) {
      console.error("Error unsharing note:", error);
      return false;
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchSharedNotes();

    // WebSocket for real-time sync (optional)
    let ws: WebSocket | null = null;
    
    try {
      ws = new WebSocket(`ws://127.0.0.1:8000/ws`);
      
      ws.onopen = () => {
        console.log("WebSocket connected for real-time sync");
      };
      
      ws.onmessage = () => {
        fetchNotes();
        fetchSharedNotes();
      };
      
      ws.onerror = () => {
        // Silently handle WebSocket errors
      };
      
      ws.onclose = () => {
        console.log("WebSocket closed");
      };
    } catch (error) {
      // WebSocket is optional
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [token]);

  return { 
    notes, 
    sharedNotes, 
    addNote, 
    deleteNote, 
    editNote, 
    shareNote, 
    unshareNote 
  };
};
