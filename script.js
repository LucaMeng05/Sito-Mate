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
const eloCurrent = document.getElementById("eloCurrent");
const eloChangeDisplay = document.getElementById("eloChange");

let sequenze = [];
let sequenzaCorrente = null;
let userUid = null;
let currentDifficulty = null;
let sequenzeFiltrate = [];
let problemiRisolti = new Set();
let currentElo = 1000;

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
    eloCurrent.textContent = "ELO: 1000";
    currentElo = 1000;
  } else {
    loginModal.classList.remove("active");
    userUid = user.uid;
    
    // Salva nome utente nel database
    const userRef = ref(db, 'utenti/' + userUid);
    const snap = await get(userRef);
    if (snap.exists()) {
      const data = snap.val();
      // Carica problemi già risolti
      if (data.problemiRisolti) {
        problemiRisolti = new Set(data.problemiRisolti);
      }
      
      // Aggiorna ELO corrente
      currentElo = data.elo || 1000;
      eloCurrent.textContent = `ELO: ${currentElo}`;
      
      // Controlla e aggiorna prefisso M
      await controllaPrefissoM(data);
    } else {
      await set(userRef, { 
        elo: 1000, 
        storicoELO: {0:1000},
        nome: user.displayName || user.email.split('@')[0],
        email: user.email || "",
        problemiRisolti: [],
        prefissoM: false,
        problemi2100Risolti: 0
      });
      currentElo = 1000;
      eloCurrent.textContent = "ELO: 1000";
    }
    
    sequenzaEl.innerText = "Scegli difficoltà";
    scegliDifficoltaBtn.disabled = false;
  }
});

// Controlla se assegnare prefisso M
async function controllaPrefissoM(userData) {
  if (userData.prefissoM) return; // Già ha il prefisso
  
  const elo = userData.elo || 1000;
  const problemi2100Risolti = userData.problemi2100Risolti || 0;
  
  if (elo >= 2000 && problemi2100Risolti >= 3) {
    await update(ref(db, 'utenti/' + userUid), {
      prefissoM: true
    });
  }
}

// Seleziona difficoltà
diffOptions.forEach(option => {
  option.addEventListener('click', async () => {
    currentDifficulty = option.dataset.difficulty;
    const minElo = parseInt(option.dataset.min);
    const maxElo = parseInt(option.dataset.max);
    
    // Filtra sequenze per difficoltà
    sequenzeFiltrate = sequenze.filter(seq => {
      const eloSeq = seq.elo || 1000;
      return eloSeq >= minElo && eloSeq <= maxElo;
    });
    
    // Filtra sequenze NON ancora risolte
    const sequenzeNonRisolte = sequenzeFiltrate.filter(seq => {
      const sequenzaId = seq.sequence.join(',');
      return !problemiRisolti.has(sequenzaId);
    });
    
    if (sequenzeNonRisolte.length === 0) {
      sequenzaEl.innerText = "Problemi finiti per questa difficoltà!";
      inviaBtn.disabled = true;
      nuovaSequenzaBtn.disabled = true;
      return;
    }
    
    // Abilita bottoni
    inviaBtn.disabled = false;
    nuovaSequenzaBtn.disabled = false;
    
    // Genera prima sequenza tra quelle non risolte
    generaSequenza(sequenzeNonRisolte);
    
    // Chiudi modal
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
  
  // Nascondi variazione ELO precedente
  eloChangeDisplay.className = 'elo-change-display';
  eloChangeDisplay.classList.remove('show');
  
  // Focus sull'input senza spostare la pagina
  setTimeout(() => {
    rispostaInput.focus({preventScroll: true});
  }, 100);
}

// Controlla risposta
inviaBtn
