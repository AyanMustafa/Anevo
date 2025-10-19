import { useState, useEffect, useCallback } from "react";

//The messenger that talks to the backend API.
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
  sharedWith?: string[];  // List of usernames this note is shared with
};

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [sharedNotes, setSharedNotes] = useState<Note[]>([]);
  const token = localStorage.getItem("token");

  console.log("🔑 useNotes - Token from localStorage:", token ? `${token.substring(0, 20)}...` : "NULL");

  const fetchNotes = useCallback(async () => {
    if (!token) {
      console.log(" fetchNotes - No token found");
      return;
    }
    
    console.log(" fetchNotes - Sending request with token:", token.substring(0, 20) + "...");
    
    try {
      const res = await fetch(`${API_BASE_URL}/notes`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      console.log(" fetchNotes - Response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log(" fetchNotes - Success! Data:", data);
        // Backend returns array directly, not wrapped in {notes: []}
        setNotes(Array.isArray(data) ? data : []);
      } else if (res.status === 401) {
        console.log(" fetchNotes - 401 Unauthorized! Redirecting to login...");
        // Token expired or invalid
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      } else {
        console.log(" fetchNotes - Unexpected status:", res.status);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  }, [token]);

  const fetchSharedNotes = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/notes/shared`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setSharedNotes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching shared notes:", error);
    }
  }, [token]);

  const addNote = async (note: Omit<Note, "id">) => {
    if (!token) {
      console.error("No token found");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/notes`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
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
      const res = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
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
      const res = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
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
      const res = await fetch(`${API_BASE_URL}/notes/${noteId}/share`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ username, can_edit: canEdit }),
      });

      const data = await res.json();

      if (res.ok) {
        await fetchNotes(); // Refresh notes to show updated sharedWith list
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
      const res = await fetch(`${API_BASE_URL}/notes/${noteId}/share/${username}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (res.ok) {
        await fetchNotes(); // Refresh notes to show updated sharedWith list
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
  }, [token, fetchNotes, fetchSharedNotes]);

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
