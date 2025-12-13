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
let problemiSbagliati = new Set();
let partiteGiocate = 0;

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
    problemiSbagliati.clear();
    partiteGiocate = 0;
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
      if (data.problemiSbagliati) {
        problemiSbagliati = new Set(data.problemiSbagliati);
      }
      partiteGiocate = data.partiteGiocate || 0;
    } else {
      await set(userRef, { 
        elo: 1200,
        storicoELO: {0:1200},
        nome: user.displayName || user.email.split('@')[0],
        email: user.email || "",
        problemiRisolti: [],
        problemiSbagliati: [],
        titolo: "",
        problemi2150Risolti: 0,
        problemi2250Risolti: 0,
        partiteGiocate: 0
      });
    }
    
    caricaElo();
    sequenzaEl.innerText = "Scegli difficoltà";
    scegliDifficoltaBtn.disabled = false;
  }
});

// Carica ELO (SENZA BADGE - come richiesto)
async function caricaElo() {
  if(!userUid) return;
  const userRef = ref(db,'utenti/'+userUid);
  const snap = await get(userRef);
  if(!snap.exists()) {
    await set(userRef,{
      elo: 1200,
      storicoELO:{0:1200}, 
      titolo: "", 
      problemi2150Risolti: 0,
      problemi2250Risolti: 0,
      partiteGiocate: 0
    });
    eloDisplay.textContent = "ELO: 1200";
  } else {
    eloDisplay.textContent = `ELO: ${snap.val().elo||1200}`;
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
      return !problemiRisolti.has(sequenzaId) && !problemiSbagliati.has(sequenzaId);
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
  } else {
    const sequenzaId = sequenzaCorrente.sequence.join(',');
    problemiSbagliati.add(sequenzaId);
  }

  await salvaProblemi();
  
  feedback.innerText = corretto ? "✓ Corretto" : "✗ Sbagliato";
  feedback.style.color = corretto ? "#059669" : "#dc2626";
  feedback.style.backgroundColor = corretto ? "#d1fae5" : "#fee2e2";
  feedback.style.borderColor = corretto ? "#10b981" : "#ef4444";
});

// Calcola delta ELO con MODIFICA: dimezza se ELO ≥ 2100
function calcolaDeltaElo(corretto){
  const eloUtente = Number(eloDisplay.textContent.replace("ELO: ",""));
  const eloProblema = sequenzaCorrente.elo || 1200;
  let diff = eloProblema - eloUtente;
  let segno = diff >= 0 ? 1 : -1;
  if(Math.abs(diff) > 400) diff = 400;
  let varDelta = segno * (Math.floor(Math.abs(diff) ** 0.5)-1);
  
  // Base delta
  let delta = corretto ? 19 + varDelta : -29 + varDelta;
  
  // RADDOPPIA per prime 5 partite
  if (partiteGiocate < 5) {
    delta = delta * 2;
  }
  
  // MODIFICA: DIMEZZA se ELO utente ≥ 2100
  if (eloUtente >= 2100) {
    delta = Math.floor(delta / 2);
  }
  
  return Math.round(delta * 10) / 10; // Arrotonda a 1 decimale
}

// Aggiorna ELO e controlla titoli NM/GM
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
  
  partiteGiocate++;
  
  const updates = {
    elo: nuovoElo,
    storicoELO: storico,
    partiteGiocate: partiteGiocate
  };
  
  // Incrementa contatori problemi speciali se risolto
  if (corretto) {
    if (sequenzaCorrente.elo >= 2150) {
      const current2150 = snap.val().problemi2150Risolti || 0;
      updates.problemi2150Risolti = current2150 + 1;
    }
    if (sequenzaCorrente.elo >= 2250) {
      const current2250 = snap.val().problemi2250Risolti || 0;
      updates.problemi2250Risolti = current2250 + 1;
    }
  }
  
  await update(userRef, updates);
  
  // Controlla titoli NM/GM
  await controllaTitoli();
  
  animaElo(elo, nuovoElo, delta);
}

// Salva problemi risolti e sbagliati
async function salvaProblemi() {
  const userRef = ref(db,'utenti/'+userUid);
  await update(userRef, {
    problemiRisolti: Array.from(problemiRisolti),
    problemiSbagliati: Array.from(problemiSbagliati)
  });
}

async function controllaTitoli() {
  console.log("🔍 Controllando titoli...");
  if (!userUid) return;
  
  const userRef = ref(db, 'utenti/' + userUid);
  const snap = await get(userRef);
  if (!snap.exists()) return;
  
  const userData = snap.val();
  const elo = userData.elo || 1200;
  const problemi2150Risolti = userData.problemi2150Risolti || 0;
  const problemi2250Risolti = userData.problemi2250Risolti || 0;
  const titoloAttuale = userData.titolo || "";
  
  console.log(`📊 Statistiche: ELO=${elo}, 2150+=${problemi2150Risolti}, 2250+=${problemi2250Risolti}, Titolo=${titoloAttuale}`);
  
  // GM (Grandmaster)
  if (elo >= 2200 && problemi2250Risolti >= 3 && titoloAttuale !== "GM") {
    console.log("🎉 Assegnando titolo GM!");
    await update(userRef, { titolo: "GM" });
    
    feedback.innerText = "🎉 Congratulazioni! Hai ottenuto il titolo GM!";
    feedback.style.color = "#ffffff";
    feedback.style.backgroundColor = "#1f2937";
    feedback.style.borderColor = "#374151";
    
    setTimeout(() => {
      if (feedback.innerText.includes("GM")) {
        feedback.innerText = "";
      }
    }, 5000);
    return;
  }
  
  // NM (National Master)
  if (elo >= 2100 && problemi2150Risolti >= 2 && titoloAttuale !== "GM" && titoloAttuale !== "NM") {
    console.log("🎉 Assegnando titolo NM!");
    await update(userRef, { titolo: "NM" });
    
    feedback.innerText = "🎉 Congratulazioni! Hai ottenuto il titolo NM!";
    feedback.style.color = "#ffffff";
    feedback.style.backgroundColor = "#3b82f6";
    feedback.style.borderColor = "#2563eb";
    
    setTimeout(() => {
      if (feedback.innerText.includes("NM")) {
        feedback.innerText = "";
      }
    }, 5000);
    return;
  }
  
  // CM (Candidate Master) - manteniamo il vecchio sistema CM se vuoi
  if (elo >= 1900 && titoloAttuale === "") {
    console.log("🎉 Assegnando titolo CM!");
    await update(userRef, { titolo: "CM" });
    
    feedback.innerText = "🎉 Congratulazioni! Hai ottenuto il titolo CM!";
    feedback.style.color = "#1f2937";
    feedback.style.backgroundColor = "#f9fafb";
    feedback.style.borderColor = "#d1d5db";
    
    setTimeout(() => {
      if (feedback.innerText.includes("CM")) {
        feedback.innerText = "";
      }
    }, 5000);
  }
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

// Nuova sequenza
nuovaSequenzaBtn.addEventListener("click", ()=>{
  if(currentDifficulty && sequenzeFiltrate.length > 0) {
    const sequenzeNonRisolte = sequenzeFiltrate.filter(seq => {
      const sequenzaId = seq.sequence.join(',');
      return !problemiRisolti.has(sequenzaId) && !problemiSbagliati.has(sequenzaId);
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
