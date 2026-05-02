import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

// TODO: Replace with your actual Firebase config from the Firebase Console
// Go to Project Settings > General > Your Apps > Web App
const firebaseConfig = {
  apiKey: "AIzaSyCmUY_tmP5uFPGUEQopfN3idpu3Ok5PDjw",
  authDomain: "easyworship-presenter.firebaseapp.com",
  databaseURL: "https://easyworship-presenter-default-rtdb.firebaseio.com",
  projectId: "easyworship-presenter",
  storageBucket: "easyworship-presenter.firebasestorage.app",
  messagingSenderId: "835336136514",
  appId: "1:835336136514:web:a694739f27372af662cadb",
  measurementId: "G-WGMCBLMZE6"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Update Live State in the cloud
export const sendLiveUpdate = (state) => {
  set(ref(db, 'liveState'), {
    ...state,
    timestamp: Date.now()
  });
};

// Listen for Live State changes from the cloud
export const subscribeToLiveUpdates = (callback) => {
  const liveRef = ref(db, 'liveState');
  return onValue(liveRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data);
    }
  });
};
