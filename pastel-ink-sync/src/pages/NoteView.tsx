import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
// Firebase removed. NoteView now uses backend APIs instead of Firestore onSnapshot.

const NoteView = () => {
  const { id } = useParams();
  const [note, setNote] = useState<{ title?: string; content?: string } | null>(null);
  type NoteItem = { id?: number | string; title?: string; content?: string };

  useEffect(() => {
    // fallback: fetch note from backend when viewing
    const fetchNote = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch(`http://127.0.0.1:8000/notes?token=${token}`);
        if (!res.ok) return;
        const notes = await res.json();
        const found = notes.find((n: unknown) => {
          if (n && typeof n === "object") {
            const ni = n as NoteItem;
            return String(ni.id) === String(id);
          }
          return false;
        }) as NoteItem | undefined;
        if (found) setNote(found);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNote();
  }, [id]);

  if (!note) return <p>Loading note...</p>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">{note.title}</h1>
      <p>{note.content}</p>
    </div>
  );
};

export default NoteView;
