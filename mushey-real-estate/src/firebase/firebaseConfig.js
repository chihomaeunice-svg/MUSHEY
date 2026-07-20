import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAsJwmoCuFsJa-v1wb3BqOl6n_VOFy9mjQ",
  authDomain: "mushey-real-estate.firebaseapp.com",
  projectId: "mushey-real-estate",
  storageBucket: "mushey-real-estate.firebasestorage.app",
  messagingSenderId: "126671735659",
  appId: "1:126671735659:web:d678d1c6945d898e551a2e",
  measurementId: "G-D566GQYTCM"
};

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);