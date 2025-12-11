import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Firebase
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app);

// HTML refs
const sequenceBox = document.getElementById("sequenceBox");
const eloBox = document.getElementById("eloUtente");
const eloDelta = document.getElementById("eloDelta");
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

// Generate sequence
function generaSequenza() {
    const i = Math.floor(Math.random() * sequenze.length);
    sequenzaCorrente = sequenze[i];

    sequenzaBox.innerText = sequenzaCorrente.sequence.join(", ") + ", ?";
    rispostaInput.value = "";
    document.getElementById("feedback").innerText = "";
    eloDelta.innerText = "";

    inviaBtn.style.display = "inline-block";
}

// Animate ELO
function aggiornaEloBox(oldElo, newElo) {
    const delta = newElo - oldElo;

    // ELO delta indicator
    eloDelta.innerText = delta > 0 ? `(+${delta})` : `(${delta})`;
    eloDelta.style.color = delta > 0 ? "#2ecc71" : "#e74c3c";

    // remove previous class
    eloBox.classList.remove("elo-gain", "elo-loss");
    void eloBox.offsetWidth;

    // Add animation based on gain/loss
    if (delta >= 0) {
        eloBox.classList.add("elo-gain");
    } else {
        eloBox.classList.add("elo-loss");
    }

    // Animate the number
    let start = oldElo;
    const end = newElo;
    const duration = 500;
    const step = (end - start) / (duration / 20);

    const anim = setInterval(() => {
        start += step;
        if ((step > 0 && start >= end) || (step < 0 && start <= end)) {
            start = end;
            clearInterval(anim);
        }
        eloBox.innerText = "ELO: " + Math.round(start);
    }, 20);
}

// Auto-login
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

    eloBox.dataset.value = elo;
    eloBox.innerText = "ELO: " + elo;

    sequenceBox.style.display = "block";
    generaSequenza();
});

// Check answer
async function controllaRisposta() {
    const user = auth.currentUser;
    if (!user || !sequenzaCorrente) return;

    const userRef = ref(db, "utenti/" + user.uid);
    const snap = await get(userRef);
    let elo = snap.val().elo;

    const feedback = document.getElementById("feedback");
    const userAnswer = Number(rispostaInput.value);

    inviaBtn.style.display = "none";

    let diff = Math.abs(elo - sequenzaCorrente.elo);
    diff = Math.min(diff, 400);

    const segno = sequenzaCorrente.elo > elo ? 1 : -1;
    const varAdjust = segno * (Math.floor(Math.sqrt(diff)) - 1);

    let delta;

    if (userAnswer === sequenzaCorrente.answer) {
        feedback.innerText = "✅ Corretto!";
        delta = 19 + varAdjust;
    } else {
        feedback.innerText = "❌ Sbagliato!";
        delta = -20 + varAdjust;
    }

    const nuovoElo = Math.max(0, elo + delta);
    await update(userRef, { elo: nuovoElo });

    aggiornaEloBox(elo, nuovoElo);
    eloBox.dataset.value = nuovoElo;
}

inviaBtn.addEventListener("click", controllaRisposta);
nuovaSequenzaBtn.addEventListener("click", generaSequenza);
