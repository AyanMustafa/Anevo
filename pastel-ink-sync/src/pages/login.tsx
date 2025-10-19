import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GoogleAuth } from "@/components/GoogleAuth";
import { FileText } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setTimeout(() => setIsSliding(true), 100);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      // Store token and user data
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      toast({
        title: "Success!",
        description: "Logged in successfully",
      });

      // Wait a moment for localStorage to complete, then navigate
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      // Force a hard navigation to ensure fresh state
      window.location.href = "/";
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToRegister = () => {
    setIsSliding(false);
    setTimeout(() => navigate("/register"), 700);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(to bottom right, #C89B8C, #FFE1AF, #D4A5A5, #9B8370)' }}>
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-center gap-3 mb-8 animate-fade-in">
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
        
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
          {/* Left Side - Sign In Form */}
          <div 
            className={`w-full md:w-1/2 p-8 md:p-12 transition-all duration-700 ease-in-out ${
              isSliding ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
            }`}
          >
            <h2 className="text-3xl font-bold mb-8 text-gray-800">Sign in</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or Username</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="Enter your email or username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-gray-100 border-0 h-12 transition-all duration-300 focus:scale-105"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-gray-100 border-0 h-12 transition-all duration-300 focus:scale-105"
                />
              </div>
              
              <div className="text-center">
                <a href="#" className="text-sm text-gray-600 hover:text-gray-800 transition-colors">
                  Forgot your password?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#C89B8C] hover:bg-[#9B8370] text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'SIGN IN'}
              </Button>
            </form>

            <div className="mt-6">
              <GoogleAuth />
            </div>

            <p className="mt-6 text-center text-sm text-gray-600 md:hidden">
              Don't have an account?{' '}
              <button
                onClick={handleNavigateToRegister}
                className="text-[#C89B8C] hover:text-[#9B8370] font-semibold"
                disabled={isLoading}
              >
                Sign Up
              </button>
            </p>
          </div>

          {/* Right Side - Welcome */}
          <div 
            className={`hidden md:flex w-full md:w-1/2 bg-[#C89B8C] p-8 md:p-12 flex-col items-center justify-center text-white transition-all duration-700 ease-in-out ${
              isSliding ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
          >
            <h2 className="text-4xl font-bold mb-4">Hello, Friend!</h2>
            <p className="text-center mb-8 text-lg opacity-90">
              Enter your personal details and start journey with us
            </p>
            <Button
              onClick={handleNavigateToRegister}
              variant="outline"
              className="px-12 py-3 border-2 border-white text-white bg-transparent hover:bg-white hover:text-[#C89B8C] font-semibold rounded-full transition-all duration-500 hover:scale-110 hover:shadow-2xl"
            >
              SIGN UP
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
