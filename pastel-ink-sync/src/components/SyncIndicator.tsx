import { Cloud } from "lucide-react";

export default function SyncIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Cloud className="w-4 h-4" />
      <span>Synced</span>
    </div>
  );
}
