import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

if (!GOOGLE_CLIENT_ID) {
	console.warn("VITE_GOOGLE_CLIENT_ID is not set. Google OAuth will not be available.");
}

createRoot(document.getElementById("root")!).render(
	<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
		<App />
	</GoogleOAuthProvider>
);
