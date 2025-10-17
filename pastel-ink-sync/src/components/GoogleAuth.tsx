import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function GoogleAuth() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse | null) => {
    const idToken = credentialResponse?.credential;
    
    if (!idToken) {
      toast({
        title: "Error",
        description: "No credential received from Google",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        toast({
          title: "Success",
          description: "Logged in with Google successfully",
        });
        navigate("/notes");
      } else {
        toast({
          title: "Login Failed",
          description: data.detail || "Could not authenticate with Google",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Google auth error:", error);
      toast({
        title: "Network Error",
        description: "Could not connect to server",
        variant: "destructive",
      });
    }
  };

  const handleGoogleError = () => {
    toast({
      title: "Error",
      description: "Google sign-in failed",
      variant: "destructive",
    });
  };

  return (
    <div className="mt-6">
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with Google</span>
        </div>
      </div>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          theme="outline"
          size="large"
          width="350"
        />
      </div>
    </div>
  );
}
