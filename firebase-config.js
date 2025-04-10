if (!firebase.apps.length) {
    firebase.initializeApp({
        const firebaseConfig = {
            apiKey: process.env.APIKEY,
            authDomain: process.env.AUTHDOMAIN,
            databaseURL: process.env.DATABASEURL,
            projectId: process.env.PROJECTID,
            storageBucket: process.env.STORAGEBUCKET,
            messagingSenderId: process.env.MESSAGINGSENDER_ID,
            appId: process.env.APPID
          };
    });
}

export const db = firebase.firestore();
export const rtdb = firebase.database();
export const auth = firebase.auth();
export const storage = firebase.storage();