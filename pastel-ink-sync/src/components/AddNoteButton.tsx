import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Note } from "@/hooks/useNotes";

interface AddNoteButtonProps {
  onAdd: (note: Omit<Note, "id">) => Promise<boolean | undefined>;
}

const TAG_OPTIONS = ["work", "personal", "important"];

export default function AddNoteButton({ onAdd }: AddNoteButtonProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("work");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await onAdd({
      title,
      content,
      tags: [selectedTag],
    });

    if (success) {
      setTitle("");
      setContent("");
      setSelectedTag("work");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              required
            />
          </div>
          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Note content"
              className="min-h-[150px]"
              required
            />
          </div>
          <div>
            <Label htmlFor="tag">Category</Label>
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger id="tag">
                <SelectValue placeholder="Select a category" />
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
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Note</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
