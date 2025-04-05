// Firebase configuration and initialization
const firebaseConfig = {
    apiKey: "AIzaSyCdimEpxhfYQkmaJuWUjhegu227c-rhfY0",
    authDomain: "ipl-auction-f62cf.firebaseapp.com",
    databaseURL: "https://ipl-auction-f62cf-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ipl-auction-f62cf",
    storageBucket: "ipl-auction-f62cf.appspot.com",
    messagingSenderId: "1006195476972",
    appId: "1:1006195476972:web:6343541fb0007925ded8c9"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize services
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();
const rtdb = firebase.database();

// Enable Firestore persistence
db.enablePersistence()
  .catch((err) => {
      console.log("Firestore persistence error:", err);
  });

export { db, storage, auth, rtdb };