import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBzmwF02AuyFnvUZSZbta5Sx-xEMWHcYU4",
    authDomain: "math-c4f91.firebaseapp.com",
    databaseURL: "https://math-c4f91-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "math-c4f91",
    storageBucket: "math-c4f91.firebasestorage.app",
    messagingSenderId: "222559643526",
    appId: "1:222559643526:web:566ef9854fdb15e8776e07",
    measurementId: "G-SXX6P84M4F"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app);

// Elements
const sequenceBox = document.getElementById("sequenceBox");
const eloBox = document.getElementById("eloUtente");
const sequenzaBox = document.getElementById("sequenzaBox");
const rispostaInput = document.getElementById("rispostaUtente");
const inviaBtn = document.getElementById("inviaRispostaBtn");
const nuovaSequenzaBtn = document.getElementById("nuovaSequenzaBtn");

let sequenze = [];
let sequenzaCorrente = null;

// Load sequences
fetch("sequences.json")
    .then(r => r.json())
    .then(d => sequenze = d);

// Generate new sequence
function generaSequenza() {
    const i = Math.floor(Math.random() * sequenze.length);
    sequenzaCorrente = sequenze[i];

    sequenzaBox.innerText = sequenzaCorrente.sequence.join(", ") + ", ?";
    rispostaInput.value = "";
    document.getElementById("feedback").innerText = "";

    inviaBtn.style.display = "inline-block";
}

// Auto login on page load
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        await signInWithPopup(auth, provider);
        return;
    }

    const userRef = ref(db, "utenti/" + user.uid);
    const snap = await get(userRef);

    let elo = 1000;
    if (!snap.exists()) {
        await set(userRef, { elo: 1000 });
    } else {
        elo = snap.val().elo;
    }

    aggiornaEloBox(elo);

    sequenceBox.style.display = "block";
    generaSequenza();
});

// Animate ELO box
function aggiornaEloBox(nuovoElo) {
    const old = Number(eloBox.dataset.value || "0");
    eloBox.dataset.value = nuovoElo;

    eloBox.classList.remove("elo-anim");
    void eloBox.offsetWidth;
    eloBox.classList.add("elo-anim");

    let start = old;
    const end = nuovoElo;
    const duration = 600;
    const step = (end - start) / (duration / 20);

    const interval = setInterval(() => {
        start += step;
        if ((step >= 0 && start >= end) || (step < 0 && start <= end)) {
            start = end;
            clearInterval(interval);
        }
        eloBox.innerText = "ELO: " + Math.round(start);
    }, 20);
}

// Check answer
async function controllaRisposta() {
    const user = auth.currentUser;
    if (!user || !sequenzaCorrente) return;

    const userRef = ref(db, "utenti/" + user.uid);
    const snap = await get(userRef);
    let elo = snap.val().elo;

    const userAnswer = Number(rispostaInput.value);
    const corretta = sequenzaCorrente.answer;

    inviaBtn.style.display = "none";

    const feedback = document.getElementById("feedback");

    let diff = Math.abs(elo - sequenzaCorrente.elo);
    diff = Math.min(diff, 400);

    const segno = sequenzaCorrente.elo > elo ? +1 : -1;
    const varAdjust = segno * (Math.floor(Math.sqrt(diff)) - 1);

    let delta = 0;

    if (userAnswer === corretta) {
        feedback.innerText = "✅ Corretto!";
        delta = 19 + varAdjust;
    } else {
        feedback.innerText = `❌ Sbagliato! Risposta: ${corretta}`;
        delta = -20 + varAdjust;
    }

    const nuovoElo = Math.max(0, elo + delta);

    await update(userRef, { elo: nuovoElo });

    aggiornaEloBox(nuovoElo);
}

inviaBtn.addEventListener("click", controllaRisposta);
nuovaSequenzaBtn.addEventListener("click", generaSequenza);
