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
let partiteGiocate = 0; // Contatore partite

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
    partiteGiocate = 0; // Reset contatore
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
      // Carica partite giocate da database se esiste
      partiteGiocate = data.partiteGiocate || 0;
    } else {
      await set(userRef, { 
        elo: 1200, // ELO INIZIALE 1200
        storicoELO: {0:1200},
        nome: user.displayName || user.email.split('@')[0],
        email: user.email || "",
        problemiRisolti: [],
        titolo: "",
        problemi2200Risolti: 0, // CAMBIATO: 2200 invece di 2100
        partiteGiocate: 0
      });
    }
    
    caricaElo();
    aggiornaTitoloDisplay();
    sequenzaEl.innerText = "Scegli difficoltà";
    scegliDifficoltaBtn.disabled = false;
  }
});

// Carica ELO e aggiorna display
async function caricaElo() {
  if(!userUid) return;
  const userRef = ref(db,'utenti/'+userUid);
  const snap = await get(userRef);
  if(!snap.exists()) {
    await set(userRef,{
      elo: 1200, // ELO INIZIALE 1200
      storicoELO:{0:1200}, 
      titolo: "", 
      problemi2200Risolti: 0,
      partiteGiocate: 0
    });
    eloDisplay.textContent = "ELO: 1200";
  } else {
    eloDisplay.textContent = `ELO: ${snap.val().elo||1200}`;
  }
}

// Aggiorna display del titolo
async function aggiornaTitoloDisplay() {
  if (!userUid) return;
  
  const userRef = ref(db, 'utenti/' + userUid);
  const snap = await get(userRef);
  if (!snap.exists()) return;
  
  const data = snap.val();
  const titolo = data.titolo || "";
  
  let titoloElement = document.getElementById('titoloUtente');
  if (!titoloElement && document.querySelector('.elo-display')) {
    titoloElement = document.createElement('span');
    titoloElement.id = 'titoloUtente';
    titoloElement.style.marginLeft = '10px';
    eloDisplay.parentNode.insertBefore(titoloElement, eloDisplay.nextSibling);
  }
  
  if (titoloElement) {
    if (titolo === "CM") {
      titoloElement.textContent = "CM";
      titoloElement.className = 'utente-prefisso-cm';
      titoloElement.style.display = 'inline-block';
    } else if (titolo === "M") {
      titoloElement.textContent = "M";
      titoloElement.className = 'utente-prefisso';
      titoloElement.style.display = 'inline-block';
    } else {
      titoloElement.style.display = 'none';
    }
  }
}

// Assegna titolo CM
async function assegnaTitoloCM() {
  if (!userUid) return;
  
  const userRef = ref(db, 'utenti/' + userUid);
  const snap = await get(userRef);
  const userData = snap.val();
  const elo = userData.elo || 1200;
  const titoloAttuale = userData.titolo || "";
  
  if (elo >= 1900 && titoloAttuale !== "CM" && titoloAttuale !== "M") {
    await update(userRef, { titolo: "CM" });
    aggiornaTitoloDisplay();
    
    feedback.innerText = "🎉 Congratulazioni! Hai ottenuto il titolo CM!";
    feedback.style.color = "#1f2937";
    feedback.style.backgroundColor = "#f9fafb";
    feedback.style.borderColor = "#d1d5db";
    
    setTimeout(() => {
      if (feedback.innerText.includes("Congratulazioni! Hai ottenuto il titolo CM")) {
        feedback.innerText = "";
      }
    }, 5000);
  }
}

// Controlla e assegna titolo M
async function controllaTitoloM() {
  if (!userUid) return;
  
  const userRef = ref(db, 'utenti/' + userUid);
  const snap = await get(userRef);
  if (!snap.exists()) return;
  
  const userData = snap.val();
  const elo = userData.elo || 1200;
  const problemi2200Risolti = userData.problemi2200Risolti || 0; // 2200!
  const titoloAttuale = userData.titolo || "";
  
  if (titoloAttuale === "M") return;
  
  // CONDIZIONI AUMENTATE: ELO ≥2100 e 3 problemi ≥2200
  if (elo >= 2100 && problemi2200Risolti >= 3) {
    await update(userRef, {
      titolo: "M",
      prefissoM: true
    });
    
    aggiornaTitoloDisplay();
    
    feedback.innerText = "🎉 Congratulazioni! Hai ottenuto il titolo M (Master)!";
    feedback.style.color = "#d4af37";
    feedback.style.backgroundColor = "#fefce8";
    feedback.style.borderColor = "#f59e0b";
    
    setTimeout(() => {
      if (feedback.innerText.includes("Congratulazioni! Hai ottenuto il titolo M")) {
        feedback.innerText = "";
      }
    }, 5000);
  }
}

// Seleziona difficoltà
diffOptions.forEach(option => {
  option.addEventListener('click', async () => {
    currentDifficulty = option.dataset.difficulty;
    const minElo = parseInt(option.dataset.min);
    const maxElo = parseInt(option.dataset.max);
    
    sequenzeFiltrate = sequenze.filter(seq => {
      const eloSeq = seq.elo || 1200;
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

// Genera sequenza
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
  if (isNaN(userAnswer)) {
    feedback.innerText = "Inserisci un numero valido";
    feedback.style.color = "#dc2626";
    feedback.style.backgroundColor = "#fee2e2";
    return;
  }
  
  const corretto = userAnswer === sequenzaCorrente.answer;
  inviaBtn.disabled = true;

  const delta = calcolaDeltaElo(corretto);
  await aggiornaElo(delta, corretto);
  
  if (corretto) {
    const sequenzaId = sequenzaCorrente.sequence.join(',');
    problemiRisolti.add(sequenzaId);
    
    // INCREMENTA PROBLEMI 2200+ RISOLTI (non 2100)
    if (sequenzaCorrente.elo >= 2200) {
      await incrementaProblemi2200Risolti();
    }
    
    await salvaProblemiRisolti();
  }

  feedback.innerText = corretto ? "✓ Corretto" : "✗ Sbagliato";
  feedback.style.color = corretto ? "#059669" : "#dc2626";
  feedback.style.backgroundColor = corretto ? "#d1fae5" : "#fee2e2";
  feedback.style.borderColor = corretto ? "#10b981" : "#ef4444";
  
  await controllaTitoloM();
});

// Nuova sequenza
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

// Tasto Enter
rispostaInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !inviaBtn.disabled) {
    inviaBtn.click();
  }
});

// Calcola delta ELO con RADDOPPIO prime 5 partite
function calcolaDeltaElo(corretto){
  const eloUtente = Number(eloDisplay.textContent.replace("ELO: ",""));
  const eloProblema = sequenzaCorrente.elo || 1200;
  let diff = eloProblema - eloUtente;
  let segno = diff >= 0 ? 1 : -1;
  if(Math.abs(diff) > 400) diff = 400;
  let varDelta = segno * (Math.floor(Math.abs(diff) ** 0.5)-1);
  
  // Base delta
  let delta = corretto ? 19 + varDelta : -23 + varDelta;
  
  // RADDOPPIA per prime 5 partite
  if (partiteGiocate < 5) {
    delta = delta * 2;
    console.log(`🎯 Partita ${partiteGiocate + 1}/5: delta raddoppiato = ${delta}`);
  }
  
  return delta;
}

// Aggiorna ELO e controlla titoli
async function aggiornaElo(delta, corretto){
  const userRef = ref(db,'utenti/'+userUid);
  const snap = await get(userRef);
  const elo = snap.val().elo || 1200;
  const nuovoElo = Math.max(0, elo + delta);

  let storico = snap.val().storicoELO || {0:1200};
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
  
  // Incrementa contatore partite e salva
  partiteGiocate++;
  
  await update(userRef,{
    elo: nuovoElo,
    storicoELO: storico,
    partiteGiocate: partiteGiocate
  });

  // Controlla CM dopo aggiornamento ELO
  await assegnaTitoloCM();
  
  animaElo(elo, nuovoElo, delta);
}

// Salva problemi risolti
async function salvaProblemiRisolti() {
  const userRef = ref(db,'utenti/'+userUid);
  await update(userRef, {
    problemiRisolti: Array.from(problemiRisolti)
  });
}

// Incrementa problemi 2200+ risolti
async function incrementaProblemi2200Risolti() {
  const userRef = ref(db,'utenti/'+userUid);
  const snap = await get(userRef);
  const currentCount = snap.val().problemi2200Risolti || 0;
  
  await update(userRef, {
    problemi2200Risolti: currentCount + 1
  });
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

// Logout
if (document.getElementById('logoutBtn')) {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  });
}
