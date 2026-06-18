import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBzMjfN55p3pu43krCTHHm7wjVwA6FoUmw",
  authDomain: "deergayu-9de41.firebaseapp.com",
  projectId: "deergayu-9de41",
  storageBucket: "deergayu-9de41.firebasestorage.app",
  messagingSenderId: "877453663161",
  appId: "1:877453663161:web:616aab4b23f752b26eb468",
  measurementId: "G-2RVE05YSNJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;
