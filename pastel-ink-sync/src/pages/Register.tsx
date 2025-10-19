import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GoogleAuth } from "@/components/GoogleAuth";
import { FileText } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/");
      return;
    }
    
    // Trigger slide-in animation on mount
    setTimeout(() => setIsSliding(true), 100);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          username: username,
          password: password,
          name: name || username,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Registration failed");
      }

      // Store token and user data
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      toast({
        title: "Success!",
        description: "Account created successfully",
      });

      // Navigate to index page
      navigate("/");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message :
        typeof error === "string" ? error :
        "Registration failed";

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToLogin = () => {
    setIsSliding(false);
    setTimeout(() => navigate("/login"), 700);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(to bottom right, #C89B8C, #FFE1AF, #D4A5A5, #9B8370)' }}>
      <div className="w-full max-w-4xl mx-4">
        <div className="flex items-center justify-center gap-3 mb-8">
          {!logoError ? (
            <img 
              src="/logo.svg" 
              alt="Anevo Logo" 
              className="h-12 w-12"
              onError={() => setLogoError(true)}
            />
          ) : (
            <FileText className="h-12 w-12 text-[#9B8370]" />
          )}
          <h1 className="text-3xl font-bold text-gray-800">
            Anevo
          </h1>
        </div>
        
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          {/* Left Panel - Welcome Message */}
          <div
            className={`hidden md:flex w-full md:w-1/2 bg-[#C89B8C] p-12 text-white flex-col justify-center transition-all duration-700 ease-in-out ${
              isSliding ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
            }`}
          >
            <h2 className="text-4xl font-bold mb-6">Welcome Back!</h2>
            <p className="text-lg mb-8 opacity-90">
              To keep connected with us please login with your personal info
            </p>
            <Button
              onClick={handleNavigateToLogin}
              variant="outline"
              className="px-12 py-3 border-2 border-white text-white bg-transparent hover:bg-white hover:text-[#C89B8C] font-semibold rounded-full transition-all duration-500 hover:scale-110 hover:shadow-2xl w-fit"
            >
              SIGN IN
            </Button>
          </div>

          {/* Right Panel - Register Form */}
          <div
            className={`w-full md:w-1/2 p-8 md:p-12 transition-all duration-700 ease-in-out ${
              isSliding ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
            }`}
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
              <p className="text-gray-600">Sign up to get started with Anevo</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-gray-100 border-0 h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-gray-100 border-0 h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name (Optional)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="bg-gray-100 border-0 h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-gray-100 border-0 h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-gray-100 border-0 h-12"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#C89B8C] hover:bg-[#9B8370] text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "SIGN UP"}
              </Button>
            </form>

            <div className="mt-6">
              <GoogleAuth />
            </div>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <button
                onClick={handleNavigateToLogin}
                className="text-[#C89B8C] hover:text-[#9B8370] font-semibold"
                disabled={isLoading}
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
