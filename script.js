import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
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

// Carica sequenze
fetch('sequences.json')
  .then(res => res.json())
  .then(data => sequenze = data);

// Login
async function login() {
  try {
    const result = await signInWithPopup(auth, provider);
    userUid = result.user.uid;
    caricaElo();
    generaSequenzaHome();
  } catch(err){ console.error(err); }
}

onAuthStateChanged(auth, async user => {
  if(!user) await login();
  else {
    userUid = user.uid;
    caricaElo();
    generaSequenzaHome();
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

// Genera sequenza
function generaSequenzaHome(){
  if(sequenze.length===0) return;
  const index = Math.floor(Math.random()*sequenze.length);
  sequenzaCorrente = sequenze[index];
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
  const corretto = userAnswer===sequenzaCorrente.answer;
  inviaBtn.disabled = true;

  const delta = calcolaDeltaElo(corretto);
  await aggiornaElo(delta);

  feedback.innerText = corretto ? "✅ Corretto!" : "❌ Sbagliato! La risposta era: " + sequenzaCorrente.answer;
  feedback.style.color = corretto ? "#276749" : "#c53030";
  feedback.style.borderColor = corretto ? "#9ae6b4" : "#fc8181";
  feedback.style.backgroundColor = corretto ? "#f0fff4" : "#fff5f5";
});

// Nuova sequenza
nuovaSequenzaBtn.addEventListener("click", ()=>generaSequenzaHome());

// Tasto Enter per inviare risposta
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
  let segno = diff>=0?1:-1;
  let varDelta = segno*Math.floor(Math.abs(diff)**0.5);
  if(Math.abs(varDelta)>400) varDelta=400;
  return corretto?19+varDelta:-20+varDelta;
}

// Aggiorna ELO
async function aggiornaElo(delta){
  const userRef = ref(db,'utenti/'+userUid);
  const snap = await get(userRef);
  const elo = snap.val().elo||1000;
  const nuovoElo = Math.max(0, elo+delta);

  let storico = snap.val().storicoELO||{0:1000};
  const day = Object.keys(storico).length;
  storico[day] = nuovoElo;
  await update(userRef,{elo:nuovoElo, storicoELO:storico});

  // Animazione ELO
  animaElo(elo, nuovoElo, delta);
}

// Animazione ELO migliorata
function animaElo(oldElo, newElo, delta) {
  // Mostra variazione
  eloDelta.textContent = delta >= 0 ? `+${delta}` : delta;
  eloDelta.className = 'elo-change';
  eloDelta.classList.add('show');
  eloDelta.classList.add(delta >= 0 ? 'positive' : 'negative');
  
  // Animazione numero
  let current = oldElo;
  const duration = 1200;
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
  
  // Nascondi delta dopo 2 secondi
  setTimeout(() => {
    eloDelta.classList.remove('show');
  }, 2000);
}
