import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

// Firebase web config. Everything except the API key is public, non-secret
// project metadata. The API key is read from the environment so it can be set
// without editing code. Web API keys are safe to expose to the client.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: 'tattoo-supply-c17f0.firebaseapp.com',
  projectId: 'tattoo-supply-c17f0',
  storageBucket: 'tattoo-supply-c17f0.firebasestorage.app',
  messagingSenderId: '1012042741558',
  appId: '1:1012042741558:web:6f5f8144295fcae6a8e597',
  measurementId: 'G-36KC5K020W',
}

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey)

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  authInstance = getAuth(app)
  dbInstance = getFirestore(app)
}

export const auth = authInstance
export const db = dbInstance
