import { useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import NoteCard from "@/components/NoteCard";
import AddNoteButton from "@/components/AddNoteButton";
import SyncIndicator from "@/components/SyncIndicator";
import Navbar from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Index() {
  const { notes, sharedNotes, addNote, deleteNote, editNote, shareNote } = useNotes();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSharedNotes = sharedNotes.filter((note) =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">My Notes</h1>
          </div>
          <SyncIndicator />
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <Tabs defaultValue="my-notes" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="my-notes">
              My Notes ({notes.length})
            </TabsTrigger>
            <TabsTrigger value="shared">
              Shared with Me ({sharedNotes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-notes">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No notes yet. Create your first note!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onDelete={deleteNote}
                    onEdit={editNote}
                    onShare={shareNote}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shared">
            {filteredSharedNotes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No notes shared with you yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSharedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={editNote}
                    onDelete={deleteNote}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <AddNoteButton onAdd={addNote} />
      </div>
    </div>
  );
}