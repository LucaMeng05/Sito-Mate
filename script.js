import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBzmwF02AuyFnvUZSZbta5Sx-xEMWHcYU4",
  authDomain: "math-c4f91.firebaseapp.com",
  databaseURL: "https://math-c4f91-default-rtdb.firebaseio.com",
  projectId: "math-c4f91",
  storageBucket: "math-c4f91.firebasestorage.app",
  messagingSenderId: "222559643526",
  appId: "1:222559643526:web:566ef9854fdb15e8776e07",
  measurementId: "G-SXX6P84M4F"
};

// Inizializzazione Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// ELEMENTI HTML
const authBox = document.getElementById('loginContainer');
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
  .then(data => sequenze = data)
  .catch(err => console.error('Errore caricamento JSON:', err));

// FUNZIONI
async function caricaElo() {
    const user = auth.currentUser;
    if (!user) return;

    const eloRef = ref(db, 'utenti/' + user.uid + '/elo');
    const snapshot = await get(eloRef);

    let elo = 1000;
    if (snapshot.exists()) {
        elo = snapshot.val();
    } else {
        await set(eloRef, elo);
    }

    eloDisplay.innerText = `ELO: ${elo}`;
}

async function aggiornaElo(delta) {
    const user = auth.currentUser;
    if (!user) return;

    const eloRef = ref(db, 'utenti/' + user.uid + '/elo');
    const snapshot = await get(eloRef);

    let nuovoElo = 1000;
    if (snapshot.exists()) {
        nuovoElo = snapshot.val() + delta;
        if (nuovoElo < 0) nuovoElo = 0;
    } else {
        nuovoElo += delta;
    }

    await set(eloRef, nuovoElo); // Qui ora funziona perché le regole permettono la scrittura
    eloDisplay.innerText = `ELO: ${nuovoElo}`;
}

function generaSequenzaHome() {
    if (sequenze.length === 0) {
        sequenzaBox.innerText = 'Nessuna sequenza disponibile';
        return;
    }
    const index = Math.floor(Math.random() * sequenze.length);
    sequenzaCorrente = sequenze[index];
    sequenzaBox.innerText = sequenzaCorrente.sequence.join(', ') + ', ?';
    rispostaInput.value = '';
    document.getElementById('feedback').innerText = '';
}

async function controllaRisposta() {
    if (!sequenzaCorrente) return;
    const userAnswer = Number(rispostaInput.value);
    const feedbackBox = document.getElementById('feedback');

    if (userAnswer === sequenzaCorrente.answer) {
        feedbackBox.innerText = '✅ Corretto!';
        await aggiornaElo(20);
    } else {
        feedbackBox.innerText = `❌ Sbagliato! La risposta corretta è: ${sequenzaCorrente.answer}`;
        await aggiornaElo(-10);
    }
}

function mostraSequenze() {
    authBox.style.display = 'none';
    sequenceBox.style.display = 'block';
    caricaElo();
    generaSequenzaHome();
}

// LOGIN GOOGLE
googleLoginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
        feedback.innerText = '';
    } catch (error) {
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
        mostraSequenze();
    } else {
        authBox.style.display = 'block';
        sequenceBox.style.display = 'none';
        feedback.innerText = '';
    }
});

// EVENTI PULSANTI
inviaBtn.addEventListener('click', controllaRisposta);
nuovaSequenzaBtn.addEventListener('click', generaSequenzaHome);
