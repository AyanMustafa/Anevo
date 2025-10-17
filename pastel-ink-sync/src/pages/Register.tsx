import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import GoogleAuth from "@/components/GoogleAuth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Success",
          description: "Account created successfully! Please login.",
        });
        navigate("/");
      } else {
        toast({
          title: "Registration Failed",
          description: data.detail || "Could not create account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Network Error",
        description: "Could not connect to server",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 animate-fade-in">
          Note Sharing Application
        </h1>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row-reverse animate-slide-in">
          {/* Right Side - Sign Up Form */}
          <div className="w-full md:w-1/2 p-8 md:p-12 animate-slide-in-right">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">
              Create Account
            </h2>

            {/* Social Login Buttons */}
            <div className="flex gap-3 mb-6">
              <button 
                type="button"
                title="Sign up with Facebook"
                aria-label="Sign up with Facebook"
                className="flex items-center justify-center w-12 h-12 rounded-full border border-gray-300 hover:bg-gray-50 hover:scale-110 transition-all duration-300"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#1877F2"
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                  />
                </svg>
              </button>
              <button 
                type="button"
                title="Sign up with Google"
                aria-label="Sign up with Google"
                className="flex items-center justify-center w-12 h-12 rounded-full border border-gray-300 hover:bg-gray-50 hover:scale-110 transition-all duration-300"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#4285F4"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </button>
              <button 
                type="button"
                title="Sign up with LinkedIn"
                aria-label="Sign up with LinkedIn"
                className="flex items-center justify-center w-12 h-12 rounded-full border border-gray-300 hover:bg-gray-50 hover:scale-110 transition-all duration-300"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#0077B5"
                    d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                  />
                </svg>
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  or use your email for registration
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-gray-100 border-0 h-12 transition-all duration-300 focus:scale-105"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-100 border-0 h-12 transition-all duration-300 focus:scale-105"
              />

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 mt-6"
              >
                SIGN UP
              </Button>
            </form>

            <GoogleAuth />
          </div>

          {/* Left Side - Welcome Back */}
          <div className="w-full md:w-1/2 bg-gradient-to-br from-pink-400 to-red-500 p-8 md:p-12 flex flex-col items-center justify-center text-white animate-slide-in-left">
            <h2 className="text-4xl font-bold mb-4 animate-bounce-in">Welcome Back!</h2>
            <p className="text-center mb-8 text-lg opacity-90 animate-fade-in-delay">
              To keep connected with us please login with your personal info
            </p>
            <Link to="/">
              <Button
                variant="outline"
                className="px-12 py-3 border-2 border-white text-white bg-transparent hover:bg-white hover:text-pink-500 font-semibold rounded-full transition-all duration-500 hover:scale-110 hover:shadow-2xl"
              >
                SIGN IN
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
