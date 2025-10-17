import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface ShareNoteDialogProps {
  noteId: number;
  onShare: (noteId: number, username: string, canEdit: boolean) => Promise<{ success: boolean; message: string }>;
}

export default function ShareNoteDialog({ noteId, onShare }: ShareNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await onShare(noteId, username, canEdit);

    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      });
      setUsername("");
      setCanEdit(false);
      setOpen(false);
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" title="Share note">
          <Share2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleShare} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter the username of a registered user
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="canEdit"
              checked={canEdit}
              onCheckedChange={(checked) => setCanEdit(checked as boolean)}
            />
            <Label htmlFor="canEdit" className="text-sm font-normal cursor-pointer">
              Allow recipient to edit this note
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Sharing..." : "Share"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}