import { db } from './firebase.js';
import { collection, getDocs } from 'firebase/firestore';

// Test Firestore connectivity
async function testFirestore() {
    try {
        const testCollection = await getDocs(collection(db, 'test'));
        console.log('Firestore is working:', testCollection.docs.map(doc => doc.data()));
    } catch (error) {
        console.error('Error connecting to Firestore:', error);
    }
}

testFirestore();