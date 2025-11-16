// js/firebase-config.js

// Import Firebase SDK modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Your Firebase configuration (replace with your own from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyD3CxCkvz81sYFiL02s_pXQegAIkrW2cWs",
  authDomain: "guidancemanagement.firebaseapp.com",
  projectId: "guidancemanagement",
  storageBucket: "guidancemanagement.firebasestorage.app",
  messagingSenderId: "687404674870",
  appId: "1:687404674870:web:1f43ce202a98298a66cd97"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
