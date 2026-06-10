/**
 * firebase-config.js  ·  Firebase App + Auth initialisation
 * Loaded as <script type="module"> — exports app, auth, db (Firestore)
 */

import { initializeApp }               from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth }                     from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore }                from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getAnalytics, isSupported }   from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAGawiLdC44L2O1IZ49HLPCyTXuNNFOO5A",
  authDomain:        "my-first-project-1f4bd.firebaseapp.com",
  projectId:         "my-first-project-1f4bd",
  storageBucket:     "my-first-project-1f4bd.firebasestorage.app",
  messagingSenderId: "933393557814",
  appId:             "1:933393557814:web:481359882ee1bcaf25ab97",
  measurementId:     "G-9EVZDLX79P"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Analytics only where supported (not in Firefox private mode etc.)
isSupported().then(yes => { if (yes) getAnalytics(app); });
