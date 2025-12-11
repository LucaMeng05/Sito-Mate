import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

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
const logoutBtn = document.getElementById("logoutBtn");
const eloDisplay = document.getElementById("eloUtenteStat");
const classificaContainer = document.getElementById("classifica");
const ctx = document.getElementById('eloChart').getContext('2d');

let userUid = null;
let chart = null;
let classificaInterval = null;

// Login con Google
googleLoginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch(err) {
    console.error("Login error:", err);
    alert("Errore nel login. Riprova.");
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch(err) {
    console.error("Logout error:", err);
  }
});

// Controllo stato autenticazione
onAuthStateChanged(auth, async user => {
  if (!user) {
    loginModal.classList.add("active");
    userUid = null;
    eloDisplay.textContent = "ELO: --";
    if (chart) chart.destroy();
    if (classificaInterval) clearInterval(classificaInterval);
    classificaContainer.innerHTML = '<div class="loading">Login richiesto</div>';
  } else {
    loginModal.classList.remove("active");
    userUid = user.uid;
    caricaStatistiche();
    caricaClassifica();
    
    // Aggiorna classifica ogni 10 secondi
    if (classificaInterval) clearInterval(classificaInterval);
    classificaInterval = setInterval(caricaClassifica, 10000);
  }
});

// Carica statistiche personali
async function caricaStatistiche(){
  if(!userUid) return;
  const userRef = ref(db,'utenti/'+userUid);
  const snap = await get(userRef);
  
  if(snap.exists()){
    const data = snap.val();
    eloDisplay.textContent = `ELO: ${data.elo||1000}`;
    
    if(data.storicoELO){
      creaGrafico(data.storicoELO);
    }
  }
}

// Carica classifica top 10 - VERSIONE CORRETTA
async function caricaClassifica(){
  if(!userUid) {
    console.log("User UID non disponibile");
    return;
  }
  
  try {
    console.log("Caricamento classifica...");
    const utentiRef = ref(db, 'utenti');
    const snap = await get(utentiRef);
    
    if(!snap.exists()) {
      console.log("Nessun dato trovato nel database");
      classificaContainer.innerHTML = '<div class="loading">Nessun utente trovato</div>';
      return;
    }
    
    const utenti = snap.val();
    console.log("Dati ricevuti:", utenti);
    
    const classificaArray = [];
    
    // Converti oggetto in array con controllo errori
    for (const [uid, dati] of Object.entries(utenti)) {
      try {
        // Controlla che dati sia un oggetto valido
        if (dati && typeof dati === 'object') {
          const elo = Number(dati.elo) || 1000;
          const nome = dati.nome || "Utente";
          const email = dati.email || "Anonimo";
          
          classificaArray.push({
            uid: uid,
            nome: nome,
            email: email,
            elo: elo
          });
        }
      } catch (err) {
        console.error(`Errore nel parsing dell'utente ${uid}:`, err);
      }
    }
    
    console.log("Utenti trovati:", classificaArray.length);
    
    if (classificaArray.length === 0) {
      classificaContainer.innerHTML = '<div class="loading">Nessun utente in classifica</div>';
      return;
    }
    
    // Ordina per ELO (decrescente)
    classificaArray.sort((a, b) => b.elo - a.elo);
    
    // Prendi top 10
    const top10 = classificaArray.slice(0, 10);
    
    // Mostra classifica
    mostraClassifica(top10);
    
  } catch(err) {
    console.error("Errore caricamento classifica:", err);
    classificaContainer.innerHTML = '<div class="loading">Errore: ' + err.message + '</div>';
  }
}

// Mostra classifica
function mostraClassifica(top10) {
  if(top10.length === 0) {
    classificaContainer.innerHTML = '<div class="loading">Nessun utente in classifica</div>';
    return;
  }
  
  let html = '';
  
  top10.forEach((utente, index) => {
    const posizione = index + 1;
    const isCurrentUser = utente.uid === userUid;
    const posizioneClass = posizione === 1 ? 'oro' : posizione === 2 ? 'argento' : posizione === 3 ? 'bronzo' : '';
    
    // Estrai nome
    let nomeMostrato = utente.nome;
    if((nomeMostrato === "Utente" || !nomeMostrato) && utente.email && utente.email !== "Anonimo") {
      nomeMostrato = utente.email.split('@')[0];
    }
    
    html += `
      <div class="classifica-item ${isCurrentUser ? 'current-user' : ''}">
        <span class="posizione ${posizioneClass}">${posizione}.</span>
        <div class="utente-info">
          <div class="utente-nome" title="${nomeMostrato}">${nomeMostrato}</div>
        </div>
        <div class="utente-elo">
          <span class="utente-elo-valore">${utente.elo}</span>
        </div>
      </div>
    `;
  });
  
  classificaContainer.innerHTML = html;
  console.log("Classifica visualizzata:", top10.length, "utenti");
}

// Crea grafico personale
function creaGrafico(storicoELO){
  // Prendi solo ultime 30 variazioni
  const chiavi = Object.keys(storicoELO).map(Number).sort((a,b) => a-b);
  const ultime30 = chiavi.slice(-30);
  
  const valori = ultime30.map(chiave => storicoELO[chiave]);
  
  if(chart) {
    chart.destroy();
  }
  
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ultime30.map((_, i) => i + 1),
      datasets: [{
        data: valori,
        borderColor: '#4a6fa5',
        backgroundColor: 'rgba(74, 111, 165, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.2,
        pointRadius: 3,
        pointBackgroundColor: '#4a6fa5'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `ELO: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: { 
            color: 'rgba(0,0,0,0.1)',
            drawBorder: false
          },
          ticks: {
            font: { size: 11 }
          }
        },
        x: {
          grid: { 
            color: 'rgba(0,0,0,0.1)',
            drawBorder: false
          },
          ticks: {
            font: { size: 11 }
          }
        }
      }
    }
  });
}

// Test: Carica classifica anche se ci sono errori
setTimeout(() => {
  if(userUid) {
    caricaClassifica();
  }
}, 2000);
