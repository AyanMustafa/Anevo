import { FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export const Navbar = () => {
  const { toast } = useToast();
  const [logoError, setLogoError] = useState(false);

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    
    // Force redirect to login
    window.location.href = "/login";
  };

  // Safely parse user data
  let user = { name: "", username: "" };
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      user = JSON.parse(userStr);
    }
  } catch (error) {
    console.error("Error parsing user data:", error);
  }

  return (
    <nav className="bg-[#C89B8C] border-b border-[#9B8370] px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Logo - will fallback to icon if image fails */}
          {!logoError ? (
            <img 
              src="/logo.svg" 
              alt="Anevo Logo" 
              className="h-8 w-8 object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <FileText className="h-8 w-8 text-white" />
          )}
          
          <span className="text-xl font-bold text-white">
            Anevo
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-white/90">
            Welcome, <span className="font-semibold text-white">{user.name || user.username || "User"}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white hover:text-white hover:bg-[#9B8370]"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
};
