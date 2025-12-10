// script.js

// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Config Firebase aggiornata
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

// Sequenze
let sequenze = [];
let sequenzaCorrente = null;

// Carica JSON delle sequenze
fetch('sequences.json')
  .then(res => res.json())
  .then(data => { sequenze = data; })
  .catch(err => console.error('Errore caricamento JSON:', err));

// Genera sequenza casuale
function generaSequenzaHome() {
    if (sequenze.length === 0) return;
    let index = Math.floor(Math.random() * sequenze.length);
    sequenzaCorrente = sequenze[index];
    document.getElementById('sequenzaBox').innerText = sequenzaCorrente.sequence.join(', ') + ', ?';
}

// Controlla risposta
function controllaRisposta() {
    let userAnswer = document.getElementById('rispostaUtente').value;
    let feedbackBox = document.getElementById('feedback');

    if (!sequenzaCorrente) {
        feedbackBox.innerText = 'Nessuna sequenza caricata.';
        return;
    }

    if (Number(userAnswer) === sequenzaCorrente.answer) {
        feedbackBox.innerText = '✅ Corretto!';
        aggiornaElo(20); // Aumenta ELO
    } else {
        feedbackBox.innerText = `❌ Sbagliato! La risposta corretta è: ${sequenzaCorrente.answer}`;
        aggiornaElo(-10); // Perde ELO
    }
}

// Aggiorna ELO utente in Firestore
async function aggiornaElo(delta) {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, 'utenti', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        let nuovoElo = docSnap.data().elo + delta;
        if (nuovoElo < 0) nuovoElo = 0;
        await updateDoc(userRef, { elo: nuovoElo });
        console.log(`Nuovo ELO: ${nuovoElo}`);
    }
}

// Registrazione utente
async function registerUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const feedback = document.getElementById('authFeedback');

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'utenti', userCredential.user.uid), { elo: 1000 });
        feedback.style.color = 'green';
        feedback.innerText = 'Registrazione completata! ELO iniziale: 1000';
        mostraSequenze();
    } catch(error) {
        feedback.style.color = 'red';
        feedback.innerText = error.message;
    }
}

// Login utente
async function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const feedback = document.getElementById('authFeedback');

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const docSnap = await getDoc(doc(db, 'utenti', userCredential.user.uid));
        if (docSnap.exists()) {
            feedback.style.color = 'green';
            feedback.innerText = `Login effettuato! ELO attuale: ${docSnap.data().elo}`;
            mostraSequenze();
        }
    } catch(error) {
        feedback.style.color = 'red';
        feedback.innerText = error.message;
    }
}

// Mostra box sequenze dopo login
function mostraSequenze() {
    document.getElementById('authBox').style.display = 'none';
    document.getElementById('sequenceBox').style.display = 'block';
    generaSequenzaHome();
}
