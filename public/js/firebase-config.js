/**
 * firebase-config.js  ·  Firebase App + Auth initialisation
 * Loaded as <script type="module"> — exports app, auth, db (Firestore)
 */

import { initializeApp }               from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth }                     from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore }                from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getAnalytics, isSupported }   from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBcfj0mwXVkQwIcr3RkVDI8HWo94ObF8IY",
  authDomain: "shadowskills-ai-a26e8.firebaseapp.com",
  projectId: "shadowskills-ai-a26e8",
  storageBucket: "shadowskills-ai-a26e8.firebasestorage.app",
  messagingSenderId: "610174676187",
  appId: "1:610174676187:web:198c79e423c2dea2b670fe",
  measurementId: "G-NG6LZB0FYX"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Analytics only where supported (not in Firefox private mode etc.)
isSupported().then(yes => { if (yes) getAnalytics(app); });
