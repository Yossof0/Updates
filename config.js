// Copy this file to `config.js` and fill in your Firebase project values to enable
// shared messages across visitors. If `config.js` is not present the app will
// continue to use localStorage and messages will remain local to each browser.

// 1) Create a Firebase project at https://console.firebase.google.com
// 2) Add a Web App, then copy the config below and paste the values.
// 3) Enable Firestore in your project (use test mode during development).

// Copy this file to `config.js` and edit if you want to enable realtime sync.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAAVvOuvAGpkoQQKIN6G_pXUYBZog7sOLw",
  authDomain: "drmproject-90c86.firebaseapp.com",
  projectId: "drmproject-90c86",
  storageBucket: "drmproject-90c86.firebasestorage.app",
  messagingSenderId: "813361976515",
  appId: "1:813361976515:web:53208a51f9d6060c9afe76",
  measurementId: "G-KR0FVEL5SF",
  // The realtime DB URL for your project; you'll find this in the Firebase console
  databaseURL: "https://drmproject-90c86-default-rtdb.europe-west1.firebasedatabase.app"
};

// Security note: The client config is public — secure your Firestore rules before
// using this in production. For a read-write chat you'll want rules that restrict
// who can delete messages (for example, only allow deletes from a server or a
// specific admin UID). This sample keeps rules open for quick testing.
