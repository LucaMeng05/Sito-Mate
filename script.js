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
const googleLoginBtn = document.getElementById("googleLoginBtn");
const sequenzaEl = document.getElementById("sequenzaBox");
const rispostaInput = document.getElementById("rispostaUtente");
const inviaBtn = document.getElementById("inviaRispostaBtn");
const nuovaSequenzaBtn = document.getElementById("nuovaSequenzaBtn");
const feedback = document.getElementById("feedback");
const eloDisplay = document.getElementById("eloUtente");
const eloDelta = document.getElementById("eloDelta");
const diffButtons = document.querySelectorAll('.diff-btn');

let sequenze = [];
let sequenzaCorrente = null;
let userUid = null;
let currentDifficulty = null;
let sequenzeFiltrate = [];

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

// Controllo stato autenticazione
onAuthStateChanged(auth, async user => {
  if (!user) {
    loginModal.classList.add("active");
    userUid = null;
    sequenzaEl.innerText = "Login richiesto";
    inviaBtn.disabled = true;
    nuovaSequenzaBtn.disabled = true;
    diffButtons.forEach(btn => btn.disabled = true);
  } else {
    loginModal.classList.remove("active");
    userUid = user.uid;
    caricaElo();
    sequenzaEl.innerText = "Seleziona una difficoltà";
    diffButtons.forEach(btn => btn.disabled = false);
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

// Seleziona difficoltà
diffButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Rimuovi active da tutti i bottoni
    diffButtons.forEach(b => b.classList.remove('active'));
    
    // Aggiungi active al bottone cliccato
    btn.classList.add('active');
    
    currentDifficulty = btn.dataset.difficulty;
    const minElo = parseInt(btn.dataset.min);
    const maxElo = parseInt(btn.dataset.max);
    
    // Filtra sequenze per difficoltà
    sequenzeFiltrate = sequenze.filter(seq => {
      const eloSeq = seq.elo || 1000;
      return eloSeq >= minElo && eloSeq <= maxElo;
    });
    
    if (sequenzeFiltrate.length === 0) {
      sequenzaEl.innerText = "Nessuna sequenza disponibile per questa difficoltà";
      inviaBtn.disabled = true;
      nuovaSequenzaBtn.disabled = true;
      return;
    }
    
    // Abilita bottoni
    inviaBtn.disabled = false;
    nuovaSequenzaBtn.disabled = false;
    
    // Genera prima sequenza
    generaSequenza();
  });
});

// Genera sequenza casuale dalla difficoltà selezionata
function generaSequenza(){
  if(sequenzeFiltrate.length === 0) {
    sequenzaEl.innerText = "Nessuna sequenza disponibile";
    return;
  }
  
  const index = Math.floor(Math.random() * sequenzeFiltrate.length);
  sequenzaCorrente = sequenzeFiltrate[index];
  sequenzaEl.innerText = sequenzaCorrente.sequence.join(", ") + ", ?";
  rispostaInput.value = "";
  feedback.innerText = "";
  inviaBtn.disabled = false;
  rispostaInput.focus();
}

// Controlla risposta
inviaBtn.addEventListener("click", async ()=>{
  if(!sequenzaCorrente) return;
  const userAnswer = Number(rispostaInput.value);
  const corretto = userAnswer === sequenzaCorrente.answer;
  inviaBtn.disabled = true;

  const delta = calcolaDeltaElo(corretto);
  await aggiornaElo(delta);

  feedback.innerText = corretto ? "✓ Corretto" : "✗ Sbagliato";
  feedback.style.color = corretto ? "#276749" : "#c53030";
  feedback.style.borderColor = corretto ? "#9ae6b4" : "#fc8181";
  feedback.style.backgroundColor = corretto ? "#f0fff4" : "#fff5f5";
});

// Nuova sequenza (stessa difficoltà)
nuovaSequenzaBtn.addEventListener("click", ()=>{
  if(currentDifficulty && sequenzeFiltrate.length > 0) {
    generaSequenza();
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

// Aggiorna ELO
async function aggiornaElo(delta){
  const userRef = ref(db,'utenti/'+userUid);
  const snap = await get(userRef);
  const elo = snap.val().elo || 1000;
  const nuovoElo = Math.max(0, elo + delta);

  let storico = snap.val().storicoELO || {0:1000};
  const ultimoIndex = Math.max(...Object.keys(storico).map(Number));
  const nuovoIndex = ultimoIndex + 1;
  
  // Mantieni solo ultime 30 variazioni
  const storicoKeys = Object.keys(storico).map(Number).sort((a,b) => a-b);
  if (storicoKeys.length >= 30) {
    const chiaviDaEliminare = storicoKeys.slice(0, storicoKeys.length - 29);
    chiaviDaEliminare.forEach(chiave => {
      delete storico[chiave];
    });
  }
  
  storico[nuovoIndex] = nuovoElo;
  await update(userRef,{elo:nuovoElo, storicoELO:storico});

  // Animazione ELO
  animaElo(elo, nuovoElo, delta);
}

// Animazione ELO
function animaElo(oldElo, newElo, delta) {
  eloDelta.textContent = delta >= 0 ? `+${delta}` : delta;
  eloDelta.className = 'elo-change';
  eloDelta.classList.add('show');
  eloDelta.classList.add(delta >= 0 ? 'positive' : 'negative');
  
  let current = oldElo;
  const duration = 800;
  const step = (newElo - oldElo) / (duration / 30);
  const startTime = Date.now();
  
  function update() {
    const elapsed = Date.now() - startTime;
    if (elapsed >= duration) {
      current = newElo;
      eloDisplay.textContent = `ELO: ${Math.round(current)}`;
      return;
    }
    
    current = oldElo + (newElo - oldElo) * (elapsed / duration);
    eloDisplay.textContent = `ELO: ${Math.round(current)}`;
    requestAnimationFrame(update);
  }
  
  requestAnimationFrame(update);
  
  setTimeout(() => {
    eloDelta.classList.remove('show');
  }, 2000);
}
