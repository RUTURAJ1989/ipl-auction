if (!firebase.apps.length) {
    const firebaseConfig = {
        apiKey: process.env.apiKey,
        authDomain: process.env.authDomain,
        databaseURL: process.env.databaseURL,
        projectId: process.env.projectId,
        storageBucket: process.env.storageBucket,
        messagingSenderId: process.env.messagingSenderId,
        appId: process.env.appId
    };

    firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();
export const rtdb = firebase.database();
export const auth = firebase.auth();
export const storage = firebase.storage();