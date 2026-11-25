// Firebase web app config: Firebase console > Project settings > Your apps > Web app > SDK setup and configuration.
// These values identify the project; they are not secrets. Access is enforced by firestore.rules.
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// People sign in with a username. Firebase Auth stores it as <username>@USERNAME_DOMAIN.
// No email is ever sent to this address. Change it only before creating accounts.
export const USERNAME_DOMAIN = "bigben-diesel.local";

// Show the "Quick select account" list on the sign-in screen.
// It reads names and positions from public/directory, which anyone who opens the site can see.
export const SHOW_QUICK_SELECT = true;

// false: sign-in lasts until the browser tab is closed (better for shared plant computers).
export const REMEMBER_SIGN_IN = false;

