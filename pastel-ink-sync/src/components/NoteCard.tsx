import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit2, Save, X, Lock } from "lucide-react";
import { Note } from "@/hooks/useNotes";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ShareNoteDialog from "./ShareNoteDialog";

interface NoteCardProps {
  note: Note;
  onDelete?: (id: number) => Promise<boolean | undefined>;
  onEdit: (id: number, updates: Partial<Omit<Note, "id">>) => Promise<boolean | undefined>;
  onShare?: (noteId: number, email: string, canEdit: boolean) => Promise<{ success: boolean; message: string }>;
}

const TAG_OPTIONS = ["work", "personal", "important"];

const getCardColors = (tags: string[]) => {
  const primaryTag = tags[0] || "work";
  
  const colorMap = {
    work: {
      bg: "bg-blue-50 border-blue-200",
      badge: "bg-blue-100 text-blue-800 border-blue-300",
      hover: "hover:bg-blue-100"
    },
    personal: {
      bg: "bg-green-50 border-green-200",
      badge: "bg-green-100 text-green-800 border-green-300",
      hover: "hover:bg-green-100"
    },
    important: {
      bg: "bg-red-50 border-red-200",
      badge: "bg-red-100 text-red-800 border-red-300",
      hover: "hover:bg-red-100"
    }
  };

  return colorMap[primaryTag as keyof typeof colorMap] || colorMap.work;
};

export default function NoteCard({ note, onDelete, onEdit, onShare }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [selectedTag, setSelectedTag] = useState(note.tags[0] || "work");

  const colors = getCardColors(note.tags);
  const canEdit = note.canEdit !== false;
  const isShared = note.isShared || false;

  const handleSave = async () => {
    await onEdit(note.id, { title, content, tags: [selectedTag] });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(note.title);
    setContent(note.content);
    setSelectedTag(note.tags[0] || "work");
    setIsEditing(false);
  };

  return (
    <Card className={`${colors.bg} ${colors.hover} transition-all border-2`}>
      <CardHeader>
        {isEditing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold"
            disabled={!canEdit}
          />
        ) : (
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-gray-800 flex-1">{note.title}</CardTitle>
            {isShared && (
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                <Lock className="w-3 h-3 mr-1" />
                Shared
              </Badge>
            )}
          </div>
        )}
        {isShared && note.owner && (
          <p className="text-xs text-gray-500 mt-1">Shared by: {note.owner}</p>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mb-3 min-h-[100px]"
              disabled={!canEdit}
            />
            {canEdit && (
              <div>
                <Label htmlFor={`edit-tag-${note.id}`}>Category</Label>
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger id={`edit-tag-${note.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAG_OPTIONS.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag.charAt(0).toUpperCase() + tag.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-gray-700 mb-4 whitespace-pre-wrap">{note.content}</p>
            <div className="flex flex-wrap gap-2">
              {note.tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  className={colors.badge}
                  variant="outline"
                >
                  {tag.charAt(0).toUpperCase() + tag.slice(1)}
                </Badge>
              ))}
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <span className="text-sm text-gray-600">
          {note.lastEdited ? new Date(note.lastEdited).toLocaleDateString() : "Just now"}
        </span>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              {canEdit && (
                <>
                  <Button size="sm" onClick={handleSave} variant="default">
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={handleCancel} variant="outline">
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {canEdit && (
                <Button size="sm" onClick={() => setIsEditing(true)} variant="outline">
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
              {/* Share button - only show for notes you own (not shared with you) */}
              {!isShared && onShare && (
                <ShareNoteDialog noteId={note.id} onShare={onShare} />
              )}
              {/* Delete button - only show for notes you own */}
              {!isShared && onDelete && (
                <Button
                  size="sm"
                  onClick={() => onDelete(note.id)}
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
