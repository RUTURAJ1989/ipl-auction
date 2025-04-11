import { db } from './firebase.js';

// Test Firestore connectivity
async function testFirestore() {
    try {
        const testCollection = await db.collection('test').get();
        console.log('Firestore is working:', testCollection.docs.map(doc => doc.data()));
    } catch (error) {
        console.error('Error connecting to Firestore:', error);
    }
}

testFirestore();