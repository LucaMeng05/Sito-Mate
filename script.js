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
const progressoTitoliContainer = document.getElementById("progressoTitoliContainer");

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
    progressoTitoliContainer.innerHTML = '';
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
      
      // Controlla e aggiorna titoli
      await controllaTitoli(data);
      // Mostra progresso titoli
      mostraProgressoTitoli(data);
    } else {
      // Inizializza con nessun titolo
      await set(userRef, { 
        elo: 1000, 
        storicoELO: {0:1000},
        nome: user.displayName || user.email.split('@')[0],
        email: user.email || "",
        problemiRisolti: [],
        titolo: 0, // 0 = nessuno, 1 = T3, 2 = T2, 3 = T1
        problemi2100Risolti: 0,
        titoliOttenuti: {
          T3: false,
          T2: false,
          T1: false
        }
      });
      
      // Mostra progresso titoli iniziale
      mostraProgressoTitoli({
        elo: 1000,
        problemi2100Risolti: 0,
        titolo: 0,
        titoliOttenuti: { T3: false, T2: false, T1: false }
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

// Controlla e aggiorna i titoli
async function controllaTitoli(userData) {
  if (!userUid) return;
  
  const userRef = ref(db, 'utenti/' + userUid);
  const snap = await get(userRef);
  let userDataUpdated = snap.val();
  
  const elo = userDataUpdated.elo || 1000;
  const problemi2100Risolti = userDataUpdated.problemi2100Risolti || 0;
  const titoloAttuale = userDataUpdated.titolo || 0;
  
  let nuovoTitolo = titoloAttuale;
  let titoliOttenuti = userDataUpdated.titoliOttenuti || {
    T3: false,
    T2: false,
    T1: false
  };
  
  // Controlla T3 (1600+ ELO)
  if (elo >= 1600 && !titoliOttenuti.T3) {
    titoliOttenuti.T3 = true;
    nuovoTitolo = Math.max(nuovoTitolo, 1);
  }
  
  // Controlla T2 (1800+ ELO)
  if (elo >= 1800 && !titoliOttenuti.T2) {
    titoliOttenuti.T2 = true;
    nuovoTitolo = Math.max(nuovoTitolo, 2);
  }
  
  // Controlla T1 (2000+ ELO E 3+ problemi 2100+)
  if (elo >= 2000 && problemi2100Risolti >= 3 && !titoliOttenuti.T1) {
    titoliOttenuti.T1 = true;
    nuovoTitolo = Math.max(nuovoTitolo, 3);
  }
  
  // Se c'è un cambiamento, aggiorna il database
  if (nuovoTitolo !== titoloAttuale || 
      JSON.stringify(titoliOttenuti) !== JSON.stringify(userDataUpdated.titoliOttenuti || {})) {
    
    await update(userRef, {
      titolo: nuovoTitolo,
      titoliOttenuti: titoliOttenuti
    });
    
    // Notifica l'utente se ha ottenuto un nuovo titolo
    if (nuovoTitolo > titoloAttuale) {
      mostraNotificaTitolo(nuovoTitolo);
    }
    
    // Aggiorna il progresso visuale
    mostraProgressoTitoli({
      elo: elo,
      problemi2100Risolti: problemi2100Risolti,
      titolo: nuovoTitolo,
      titoliOttenuti: titoliOttenuti
    });
  }
}

// Mostra progresso titoli nella pagina principale
function mostraProgressoTitoli(userData) {
  if (!progressoTitoliContainer) return;
  
  const elo = userData.elo || 1000;
  const problemi2100Risolti = userData.problemi2100Risolti || 0;
  const titolo = userData.titolo || 0;
  const titoliOttenuti = userData.titoliOttenuti || { T3: false, T2: false, T1: false };
  
  const titoli = [
    { nome: "T3", eloRequisito: 1600, problemiRequisito: 0, ottenuto: titoliOttenuti.T3, colore: "#000" },
    { nome: "T2", eloRequisito: 1800, problemiRequisito: 0, ottenuto: titoliOttenuti.T2, colore: "#000" },
    { nome: "T1", eloRequisito: 2000, problemiRequisito: 3, ottenuto: titoliOttenuti.T1, colore: "#3b82f6" }
  ];
  
  let html = `
    <div class="progresso-titoli-card">
      <div class="titolo-progress-header">
        <h4>Progresso Titoli</h4>
        <div class="titolo-corrente">
          ${titolo === 3 ? '<span class="titolo-badge T1">T1</span>' : 
            titolo === 2 ? '<span class="titolo-badge T2">T2</span>' : 
            titolo === 1 ? '<span class="titolo-badge T3">T3</span>' : 'Nessun titolo'}
        </div>
      </div>
  `;
  
  titoli.forEach((t, index) => {
    const eloPercent = Math.min(100, (elo / t.eloRequisito) * 100);
    const problemiPercent = t.problemiRequisito > 0 ? 
      Math.min(100, (problemi2100Risolti / t.problemiRequisito) * 100) : 100;
    
    const percentCompleto = t.problemiRequisito > 0 ? 
      (eloPercent * 0.5 + problemiPercent * 0.5) : eloPercent;
    
    const completato = t.ottenuto;
    
    html += `
      <div class="titolo-progress-item titolo-${t.nome}">
        <div class="titolo-progress-info">
          <span>
            ${completato ? '✅ ' : ''}
            <strong>${t.nome}</strong>
            ${t.nome === "T1" ? ' (2000 ELO + 3 problemi 2100+)' : ` (${t.eloRequisito}+ ELO)`}
          </span>
          <span class="percentuale">${completato ? '100%' : Math.round(percentCompleto) + '%'}</span>
        </div>
        <div class="titolo-progress-bar">
          <div class="titolo-progress-fill" style="width: ${completato ? 100 : percentCompleto}%;"></div>
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  progressoTitoliContainer.innerHTML = html;
}

// Notifica nuovo titolo
function mostraNotificaTitolo(titolo) {
  const titoliNomi = { 1: "T3", 2: "T2", 3: "T1" };
  const messaggi = {
    1: "Hai raggiunto 1600 ELO! Titolo T3 ottenuto.",
    2: "Hai raggiunto 1800 ELO! Titolo T2 ottenuto.",
    3: "Maestro! 2000 ELO e 3+ problemi 2100+! Titolo T1 ottenuto."
  };
  
  const notifica = document.createElement('div');
  notifica.className = 'notifica-titolo';
  notifica.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${titolo === 3 ? '#3b82f6' : '#1f2937'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
    ">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="
          background: rgba(255,255,255,0.2);
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          ${titolo === 3 ? 'background: white; color: #3b82f6;' : 'color: white;'}
        ">${titoliNomi[titolo]}</div>
        <div>
          <strong style="font-size: 14px;">Nuovo Titolo: ${titoliNomi[titolo]}</strong>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">
            ${messaggi[titolo]}
          </p>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(notifica);
  
  setTimeout(() => {
    notifica.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notifica.remove(), 300);
  }, 3000);
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
      feedback.innerText = "Hai completato tutti i problemi di questa difficoltà";
      feedback.style.color = "#059669";
      feedback.style.backgroundColor = "#d1fae5";
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
  feedback.innerText = "";
  inviaBtn.disabled = false;
  
  // Focus sull'input senza spostare la pagina
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
    // Aggiungi alla lista problemi risolti
    const sequenzaId = sequenzaCorrente.sequence.join(',');
    problemiRisolti.add(sequenzaId);
    
    // Conta problemi 2100+ risolti
    if (sequenzaCorrente.elo >= 2100) {
      await incrementaProblemi2100Risolti();
    }
    
    // Salva nel database
    await salvaProblemiRisolti();
    
    // Controlla titoli dopo aver risolto un problema
    const userRef = ref(db, 'utenti/' + userUid);
    const snap = await get(userRef);
    if (snap.exists()) {
      await controllaTitoli(snap.val());
    }
  }

  feedback.innerText = corretto ? "✓ Corretto" : "✗ Sbagliato";
  feedback.style.color = corretto ? "#059669" : "#dc2626";
  feedback.style.backgroundColor = corretto ? "#d1fae5" : "#fee2e2";
  feedback.style.borderColor = corretto ? "#10b981" : "#ef4444";
});

// Nuova sequenza (stessa difficoltà, non risolta)
nuovaSequenzaBtn.addEventListener("click", ()=>{
  if(currentDifficulty && sequenzeFiltrate.length > 0) {
    // Filtra solo problemi non risolti
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
  
  // Mantieni solo ultime 30 variazioni
  const storicoKeys = Object.keys(storico).map(Number).sort((a,b) => a-b);
  if (storicoKeys.length >= 30) {
    const chiaviDaEliminare = storicoKeys.slice(0, storicoKeys.length - 29);
    chiaviDaEliminare.forEach(chiave => {
      delete storico[chiave];
    });
  }
  
  storico[nuovoIndex] = nuovoElo;
  
  // Aggiorna database
  await update(userRef,{
    elo: nuovoElo,
    storicoELO: storico
  });

  // Controlla titoli dopo aggiornamento ELO
  const snap2 = await get(userRef);
  await controllaTitoli(snap2.val());

  // Animazione ELO
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
