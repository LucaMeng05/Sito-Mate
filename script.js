import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const firebaseConfig = {
apiKey: "AIzaSyBzmwF02AuyFnvUZSZbta5Sx-xEMWHcYU4",
authDomain: "math-c4f91.firebaseapp.com",
databaseURL: "https://math-c4f91-default-rtdb.europe-west1.firebasedatabase.app/",
projectId: "math-c4f91",
storageBucket: "math-c4f91.firebasestorage.app",
messagingSenderId: "222559643526",
appId: "1:222559643526:web:566ef9854fdb15e8776e07"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

const loginModal = document.getElementById("loginModal");
const difficultyModal = document.getElementById("difficultyModal");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const closeDifficultyBtn = document.getElementById("closeDifficultyBtn");
const scegliDifficoltaBtn = document.getElementById("scegliDifficoltaBtn");
const diffOptions = document.querySelectorAll('.diff-option');
const sequenzaEl = document.getElementById("sequenzaBox");
const rispostaInput = document.getElementById("rispostaUtente");
const inviaBtn = document.getElementById("inviaRispostaBtn");
const nuovaSequenzaBtn = document.getElementById("nuovaSequenzaBtn");
const feedback = document.getElementById("feedback");
const eloDisplay = document.getElementById("eloUtente");
const eloDelta = document.getElementById("eloDelta");

let sequenze = [];
let sequenzaCorrente = null;
let userUid = null;
let currentDifficulty = null;
let sequenzeFiltrate = [];
let problemiRisolti = new Set();

// Carica sequenze
fetch('sequences.json')
.then(res => res.json())
.then(data => {
sequenze = data;
console.log(`Caricate ${sequenze.length} sequenze`);
})
.catch(err => {
console.error("Errore caricamento sequenze:", err);
sequenze = [];
});

// Login con Google
googleLoginBtn.addEventListener("click", async () => {
try {
await signInWithPopup(auth, provider);
} catch(err) {
console.error("Login error:", err);
alert("Errore nel login. Riprova.");
}
});

// Apri modal difficoltà
scegliDifficoltaBtn.addEventListener("click", () => {
difficultyModal.classList.add("active");
});

// Chiudi modal difficoltà
closeDifficultyBtn.addEventListener("click", () => {
difficultyModal.classList.remove("active");
});

// Chiudi modal cliccando fuori
window.addEventListener("click", (event) => {
if (event.target === difficultyModal) {
difficultyModal.classList.remove("active");
}
if (event.target === loginModal) {
// Non chiudere login modal (obbligatorio)
}
});

// Controllo stato autenticazione
onAuthStateChanged(auth, async user => {
if (!user) {
loginModal.classList.add("active");
userUid = null;
sequenzaEl.innerText = "Login richiesto";
inviaBtn.disabled = true;
nuovaSequenzaBtn.disabled = true;
scegliDifficoltaBtn.disabled = true;
problemiRisolti.clear();
} else {
loginModal.classList.remove("active");
userUid = user.uid;

const userRef = ref(db, 'utenti/' + userUid);
const snap = await get(userRef);
if (snap.exists()) {
const data = snap.val();
if (data.problemiRisolti) {
problemiRisolti = new Set(data.problemiRisolti);
}
} else {
await set(userRef, {
elo: 1000,
storicoELO: {0:1000},
nome: user.displayName || user.email.split('@')[0],
email: user.email || "",
problemiRisolti: [],
titolo: 0,
problemi2100Risolti: 0
});
}

caricaElo();
sequenzaEl.innerText = "Scegli difficoltà";
scegliDifficoltaBtn.disabled = false;
}
});

// Carica ELO
async function caricaElo(){
if(!userUid) return;
const userRef = ref(db,'utenti/'+userUid);
const snap = await get(userRef);
if(!snap.exists()){
await set(userRef,{elo:1000, storicoELO:{0:1000}});
eloDisplay.textContent = "ELO: 1000";
} else {
eloDisplay.textContent = `ELO: ${snap.val().elo||1000}`;
}
}

// Controlla e assegna titoli
async function controllaTitoli() {
if (!userUid) return;

const userRef = ref(db, 'utenti/' + userUid);
const snap = await get(userRef);
if (!snap.exists()) return;

const userData = snap.val();
const elo = userData.elo || 1000;
const problemi2100Risolti = userData.problemi2100Risolti || 0;
let titolo = userData.titolo || 0;

let nuovoTitolo = titolo;

// T3: 1600+ ELO
if (elo >= 1600 && titolo < 1) {
nuovoTitolo = 1;
}

// T2: 1800+ ELO
if (elo >= 1800 && titolo < 2) {
nuovoTitolo = 2;
}

// T1: 2000+ ELO E 3+ problemi 2100+
if (elo >= 2000 && problemi2100Risolti >= 3 && titolo < 3) {
nuovoTitolo = 3;
}

if (nuovoTitolo !== titolo) {
await update(userRef, {
titolo: nuovoTitolo
});
}
}

// Seleziona difficoltà
diffOptions.forEach(option => {
option.addEventListener('click', async () => {
currentDifficulty = option.dataset.difficulty;
const minElo = parseInt(option.dataset.min);
const maxElo = parseInt(option.dataset.max);

sequenzeFiltrate = sequenze.filter(seq => {
const eloSeq = seq.elo || 1000;
return eloSeq >= minElo && eloSeq <= maxElo;
});

const sequenzeNonRisolte = sequenzeFiltrate.filter(seq => {
const sequenzaId = seq.sequence.join(',');
return !problemiRisolti.has(sequenzaId);
});

if (sequenzeNonRisolte.length === 0) {
sequenzaEl.innerText = "Problemi finiti per questa difficoltà!";
inviaBtn.disabled = true;
nuovaSequenzaBtn.disabled = true;
feedback.innerText = "Hai completato tutti i problemi di questa difficoltà";
feedback.style.color = "#059669";
feedback.style.backgroundColor = "#d1fae5";
return;
}

inviaBtn.disabled = false;
nuovaSequenzaBtn.disabled = false;

generaSequenza(sequenzeNonRisolte);

difficultyModal.classList.remove("active");
sequenzaEl.focus({preventScroll: true});
});
});

// Genera sequenza casuale NON risolta
function generaSequenza(sequenzeDisponibili = sequenzeFiltrate) {
if(sequenzeDisponibili.length === 0) {
sequenzaEl.innerText = "Nessuna sequenza disponibile";
return;
}

const index = Math.floor(Math.random() * sequenzeDisponibili.length);
sequenzaCorrente = sequenzeDisponibili[index];
sequenzaEl.innerText = sequenzaCorrente.sequence.join(", ") + ", ?";
rispostaInput.value = "";
feedback.innerText = "";
inviaBtn.disabled = false;

setTimeout(() => {
rispostaInput.focus({preventScroll: true});
}, 100);
}

// Controlla risposta
inviaBtn.addEventListener("click", async ()=>{
if(!sequenzaCorrente) return;
const userAnswer = Number(rispostaInput.value);
const corretto = userAnswer === sequenzaCorrente.answer;
inviaBtn.disabled = true;

const delta = calcolaDeltaElo(corretto);
await aggiornaElo(delta, corretto);

if (corretto) {
const sequenzaId = sequenzaCorrente.sequence.join(',');
problemiRisolti.add(sequenzaId);

if (sequenzaCorrente.elo >= 2100) {
await incrementaProblemi2100Risolti();
}

await salvaProblemiRisolti();
}

feedback.innerText = corretto ? "✓ Corretto" : "✗ Sbagliato";
feedback.style.color = corretto ? "#059669" : "#dc2626";
feedback.style.backgroundColor = corretto ? "#d1fae5" : "#fee2e2";
feedback.style.borderColor = corretto ? "#10b981" : "#ef4444";
});

// Nuova sequenza (stessa difficoltà, non risolta)
nuovaSequenzaBtn.addEventListener("click", ()=>{
if(currentDifficulty && sequenzeFiltrate.length > 0) {
const sequenzeNonRisolte = sequenzeFiltrate.filter(seq => {
const sequenzaId = seq.sequence.join(',');
return !problemiRisolti.has(sequenzaId);
});

if (sequenzeNonRisolte.length === 0) {
sequenzaEl.innerText = "Problemi finiti per questa difficoltà!";
inviaBtn.disabled = true;
nuovaSequenzaBtn.disabled = true;
feedback.innerText = "Hai completato tutti i problemi di questa difficoltà";
feedback.style.color = "#059669";
feedback.style.backgroundColor = "#d1fae5";
return;
}

generaSequenza(sequenzeNonRisolte);
} else {
sequenzaEl.innerText = "Seleziona prima una difficoltà";
}
});

// Tasto Enter per inviare
rispostaInput.addEventListener("keypress", (e) => {
if (e.key === "Enter" && !inviaBtn.disabled) {
inviaBtn.click();
}
});

// Calcola delta ELO
function calcolaDeltaElo(corretto){
const eloUtente = Number(eloDisplay.textContent.replace("ELO: ",""));
const eloProblema = sequenzaCorrente.elo || 1000;
let diff = eloProblema - eloUtente;
let segno = diff >= 0 ? 1 : -1;
let varDelta = segno * Math.floor(Math.abs(diff) ** 0.5);
if(Math.abs(varDelta) > 400) varDelta = 400;
return corretto ? 19 + varDelta : -20 + varDelta;
}

// Aggiorna ELO e statistiche
async function aggiornaElo(delta, corretto){
const userRef = ref(db,'utenti/'+userUid);
const snap = await get(userRef);
const elo = snap.val().elo || 1000;
const nuovoElo = Math.max(0, elo + delta);

let storico = snap.val().storicoELO || {0:1000};
const ultimoIndex = Math.max(...Object.keys(storico).map(Number));
const nuovoIndex = ultimoIndex + 1;

const storicoKeys = Object.keys(storico).map(Number).sort((a,b) => a-b);
if (storicoKeys.length >= 30) {
const chiaviDaEliminare = storicoKeys.slice(0, storicoKeys.length - 29);
chiaviDaEliminare.forEach(chiave => {
delete storico[chiave];
});
}

storico[nuovoIndex] = nuovoElo;

await update(userRef,{
elo: nuovoElo,
storicoELO: storico
});

controllaTitoli();

animaElo(elo, nuovoElo, delta);
}

// Salva problemi risolti nel database
async function salvaProblemiRisolti() {
const userRef = ref(db,'utenti/'+userUid);
await update(userRef, {
problemiRisolti: Array.from(problemiRisolti)
});
}

// Incrementa contatore problemi 2100+ risolti
async function incrementaProblemi2100Risolti() {
const userRef = ref(db,'utenti/'+userUid);
const snap = await get(userRef);
const currentCount = snap.val().problemi2100Risolti || 0;

await update(userRef, {
problemi2100Risolti: currentCount + 1
});

controllaTitoli();
}

// Animazione ELO
function animaElo(oldElo, newElo, delta) {
eloDelta.textContent = delta >= 0 ? `+${delta}` : delta;
eloDelta.className = 'elo-change';
eloDelta.classList.add('show');
eloDelta.classList.add(delta >= 0 ? 'positive' : 'negative');

let current = oldElo;
const duration = 800;
const startTime = Date.now();

function update() {
const elapsed = Date.now() - startTime;
if (elapsed >= duration) {
current = newElo;
eloDisplay.textContent = `ELO: ${Math.round(current)}`;
return;
}

const progress = elapsed / duration;
current = oldElo + (newElo - oldElo) * progress;
eloDisplay.textContent = `ELO: ${Math.round(current)}`;
requestAnimationFrame(update);
}

requestAnimationFrame(update);

setTimeout(() => {
eloDelta.classList.remove('show');
}, 2000);
}
