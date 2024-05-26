// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBRyeGKsTCLSWV4fKjfVFTTXLQvkYnnjiA",
    authDomain: "demessage-effdd.firebaseapp.com",
    projectId: "demessage-effdd",
    storageBucket: "demessage-effdd.appspot.com",
    messagingSenderId: "940982695099",
    appId: "1:940982695099:web:461f7f50aa424959d9a59e",
    measurementId: "G-27Q8H62QCY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };