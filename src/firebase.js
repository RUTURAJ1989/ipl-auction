import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "<your-api-key>",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "<your-auth-domain>",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://<your-project-id>.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "<your-project-id>",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "<your-storage-bucket>",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "<your-messaging-sender-id>",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "<your-app-id>"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
export default app;