// script.js

// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBzmwF02AuyFnvUZSZbta5Sx-xEMWHcYU4",
  authDomain: "math-c4f91.firebaseapp.com",
  projectId: "math-c4f91",
  storageBucket: "math-c4f91.firebasestorage.app",
  messagingSenderId: "222559643526",
  appId: "1:222559643526:web:566ef9854fdb15e8776e07",
  measurementId: "G-SXX6P84M4F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ELEMENTI HTML
const authBox = document.getElementById('authBox');
const sequenceBox = document.getElementById('sequenceBox');
const eloDisplay = document.getElementById('eloUtente');
const feedback = document.getElementById('authFeedback');
const sequenzaBox = document.getElementById('sequenzaBox');
const rispostaInput = document.getElementById('rispostaUtente');
const inviaBtn = document.getElementById('inviaRispostaBtn');
const nuovaSequenzaBtn = document.getElementById('nuovaSequenzaBtn');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');

// SEQUENZE
let sequenze = [];
let sequenzaCorrente = null;

// CARICA JSON DELLE SEQUENZE
fetch('sequences.json')
  .then(res => res.json())
  .then(data => { sequenze = data; })
  .catch(err => console.error('Errore caricamento JSON:', err));

// GENERA SEQUENZA CASUALE
function generaSequenzaHome() {
    if (sequenze.length === 0) return;
    let index = Math.floor(Math.random() * sequenze.length);
    sequenzaCorrente = sequenze[index];
    sequenzaBox.innerText = sequenzaCorrente.sequence.join(', ') + ', ?';
}

// CONTROLLA RISPOSTA
function controllaRisposta() {
    let userAnswer = rispostaInput.value;
    let feedbackBox = document.getElementById('feedback');

    if (!sequenzaCorrente) {
        feedbackBox.innerText = 'Nessuna sequenza caricata.';
        return;
    }

    if (Number(userAnswer) === sequenzaCorrente.answer) {
        feedbackBox.innerText = '✅ Corretto!';
        aggiornaElo(20);
    } else {
        feedbackBox.innerText = `❌ Sbagliato! La risposta corretta è: ${sequenzaCorrente.answer}`;
        aggiornaElo(-10);
    }
}

// AGGIORNA ELO UTENTE IN FIRESTORE
async function aggiornaElo(delta) {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, 'utenti', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        let nuovoElo = docSnap.data().elo + delta;
        if (nuovoElo < 0) nuovoElo = 0;
        await updateDoc(userRef, { elo: nuovoElo });
        eloDisplay.innerText = `ELO: ${nuovoElo}`;
    }
}

// MOSTRA BOX SEQUENZE DOPO LOGIN
function mostraSequenze() {
    authBox.style.display = 'none';
    sequenceBox.style.display = 'block';
    generaSequenzaHome();
}

// LOGIN GOOGLE
googleLoginBtn.addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        feedback.style.color = "green";
        feedback.innerText = "Login effettuato!";
    } catch (error) {
        feedback.style.color = "red";
        feedback.innerText = error.message;
    }
});

// LOGOUT
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        authBox.style.display = 'block';
        sequenceBox.style.display = 'none';
        feedback.innerText = '';
    });
});

// STATO AUTENTICAZIONE
onAuthStateChanged(auth, async (user) => {
    if (user) {
        authBox.style.display = 'none';
        sequenceBox.style.display = 'block';

        // Controlla se utente esiste in Firestore
        const userRef = doc(db, 'utenti', user.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
            await setDoc(userRef, { elo: 1000 });
            eloDisplay.innerText = "ELO: 1000";
        } else {
            eloDisplay.innerText = "ELO: " + docSnap.data().elo;
        }

        generaSequenzaHome();
    } else {
        authBox.style.display = 'block';
        sequenceBox.style.display = 'none';
    }
});

// EVENTI PULSANTI
inviaBtn.addEventListener('click', controllaRisposta);
nuovaSequenzaBtn.addEventListener('click', generaSequenzaHome);
