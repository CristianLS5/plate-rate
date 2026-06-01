import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

const firebaseConfig = environment.firebase.apiKey
  ? environment.firebase
  : {
      apiKey: 'demo-key',
      authDomain: 'demo.local',
      projectId: 'demo-project',
      storageBucket: 'demo.appspot.com',
      messagingSenderId: '000000000000',
      appId: '1:000000000000:web:demo',
    };

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
