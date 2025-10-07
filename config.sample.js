// Copy this file to `config.js` and fill in your Firebase project values to enable
// shared messages across visitors. If `config.js` is not present the app will
// continue to use localStorage and messages will remain local to each browser.

// 1) Create a Firebase project at https://console.firebase.google.com
// 2) Add a Web App, then copy the config below and paste the values.
// 3) Enable Firestore in your project (use test mode during development).

window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

// Security note: The client config is public — secure your Firestore rules before
// using this in production. For a read-write chat you'll want rules that restrict
// who can delete messages (for example, only allow deletes from a server or a
// specific admin UID). This sample keeps rules open for quick testing.
