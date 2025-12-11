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
}

// Controlla risposta
inviaBtn.addEventListener("click", async ()=>{
  if(!sequenzaCorrente) return;
  const userAnswer = Number(rispostaInput.value);
  const corretto = userAnswer===sequenzaCorrente.answer;
  inviaBtn.disabled = true;

  const delta = calcolaDeltaElo(corretto);
  await aggiornaElo(delta);

  feedback.innerText = corretto?"✅ Corretto!":"❌ Sbagliato!";
  feedback.style.color = corretto?"#2ecc71":"#e74c3c";
});

// Nuova sequenza
nuovaSequenzaBtn.addEventListener("click", ()=>generaSequenzaHome());

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

  eloDisplay.textContent = `ELO: ${nuovoElo}`;
  eloDelta.textContent = delta>=0?`+${delta}`:delta;
  eloDelta.style.color = delta>=0?"#2ecc71":"#e74c3c";
  eloDelta.style.opacity="1";
  setTimeout(()=>{eloDelta.style.opacity="0"},1000);
}
