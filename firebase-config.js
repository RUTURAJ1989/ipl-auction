if (!firebase.apps.length) {
    firebase.initializeApp({
        apiKey: "AIzaSyCdimEpxhfYQkmaJuWUjhegu227c-rhfY0",
        authDomain: "ipl-auction-f62cf.firebaseapp.com",
        databaseURL: "https://ipl-auction-f62cf-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "ipl-auction-f62cf",
        storageBucket: "ipl-auction-f62cf.appspot.com",
        messagingSenderId: "1006195476972",
        appId: "1:1006195476972:web:6343541fb0007925ded8c9"
    });
}

export const db = firebase.firestore();
export const rtdb = firebase.database();
export const auth = firebase.auth();
export const storage = firebase.storage();