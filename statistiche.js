
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
const titoloDisplay = document.getElementById("titoloUtenteStat"); // Aggiungi questo elemento
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
    if (titoloDisplay) titoloDisplay.style.display = "none";
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
    
    // Mostra titolo M
    if (titoloDisplay) {
      if (data.titolo === "M") {
        titoloDisplay.textContent = "M";
        titoloDisplay.style.display = "inline";
        titoloDisplay.style.color = "#d4af37";
        titoloDisplay.style.fontWeight = "700";
        titoloDisplay.style.fontSize = "18px";
        titoloDisplay.style.marginLeft = "8px";
      } else {
        titoloDisplay.style.display = "none";
      }
    }
    
    if(data.storicoELO){
      creaGrafico(data.storicoELO);
    }
  }
}

// Carica classifica top 10 + utente corrente
async function caricaClassifica(){
  if(!userUid) {
    console.log("User UID non disponibile");
    return;
  }

  try {
    const utentiRef = ref(db, 'utenti');
    const snap = await get(utentiRef);

    if(!snap.exists()) {
      classificaContainer.innerHTML = '<div class="loading">Nessun utente trovato</div>';
      return;
    }

    const utenti = snap.val();
    const classificaArray = [];

    // Converti oggetto in array
    for (const [uid, dati] of Object.entries(utenti)) {
      try {
        if (dati && typeof dati === 'object' && dati.elo !== undefined) {
          classificaArray.push({
            uid: uid,
            nome: dati.nome || (dati.email ? dati.email.split('@')[0] : "Utente"),
            email: dati.email || "",
            elo: Number(dati.elo) || 1000,
            prefissoM: dati.titolo === "M" || false  // MODIFICATO QUI
          });
        }
      } catch (err) {
        console.error(`Errore nel parsing dell'utente ${uid}:`, err);
      }
    }

    if (classificaArray.length === 0) {
      classificaContainer.innerHTML = '<div class="loading">Nessun utente in classifica</div>';
      return;
    }

    // Ordina per ELO (decrescente)
    classificaArray.sort((a, b) => b.elo - a.elo);

    // Trova posizione utente corrente
    const userIndex = classificaArray.findIndex(u => u.uid === userUid);
    const userPosition = userIndex + 1;

    // Se utente non è nei top 10, aggiungilo come 11°
    let classificaVisualizzata;
    if (userPosition > 10 && userPosition <= classificaArray.length) {
      classificaVisualizzata = classificaArray.slice(0, 10);
      // Aggiungi riga separatrice e utente corrente
      classificaVisualizzata.push({
        uid: "separator",
        nome: "...",
        elo: null,
        isSeparator: true
      });

      const userData = classificaArray[userIndex];
      classificaVisualizzata.push(userData);
    } else {
      classificaVisualizzata = classificaArray.slice(0, 10);
    }

    // Mostra classifica
    mostraClassifica(classificaVisualizzata, userPosition);

  } catch(err) {
    console.error("Errore caricamento classifica:", err);
    classificaContainer.innerHTML = '<div class="loading">Errore caricamento classifica</div>';
  }
}

// Mostra classifica
function mostraClassifica(classificaUtenti, userPosition) {
  if(classificaUtenti.length === 0) {
    classificaContainer.innerHTML = '<div class="loading">Nessun utente in classifica</div>';
    return;
  }

  let html = '';
  let posizioneMostrata = 0;

  classificaUtenti.forEach((utente, index) => {
    // Se è un separatore
    if (utente.isSeparator) {
      html += `
      <div class="classifica-item" style="justify-content: center; opacity: 0.5; font-size: 12px; padding: 8px 16px;">
        · · ·
      </div>
      `;
      return;
    }

    posizioneMostrata++;
    const isCurrentUser = utente.uid === userUid;
    const posizioneClass = posizioneMostrata === 1 ? 'oro' :
                          posizioneMostrata === 2 ? 'argento' :
                          posizioneMostrata === 3 ? 'bronzo' : '';

    // Determina posizione da mostrare
    let posizioneDaMostrare = posizioneMostrata;
    if (isCurrentUser && userPosition > 10) {
      posizioneDaMostrare = userPosition;
    }

    html += `
    <div class="classifica-item ${isCurrentUser ? 'current-user' : ''} ${userPosition > 10 && isCurrentUser ? 'outside-top' : ''}">
      <span class="posizione ${posizioneClass}">${posizioneDaMostrare}.</span>
      <div class="utente-info">
        <div class="utente-nome" title="${utente.nome}">
          ${utente.prefissoM ? '<span class="utente-prefisso">M</span>' : ''}
          ${utente.nome}
        </div>
      </div>
      <div class="utente-elo">
        <span class="utente-elo-valore">${utente.elo}</span>
      </div>
    </div>
    `;
  });

  classificaContainer.innerHTML = html;
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
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.2,
        pointRadius: 3,
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleFont: { size: 13 },
          bodyFont: { size: 14 },
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: function(context) {
              return `ELO: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: {
            color: 'rgba(0,0,0,0.05)',
            drawBorder: false
          },
          ticks: {
            font: { size: 11 },
            color: '#6b7280'
          }
        },
        x: {
          grid: {
            color: 'rgba(0,0,0,0.05)',
            drawBorder: false
          },
          ticks: {
            font: { size: 11 },
            color: '#6b7280'
          }
        }
      }
    }
  });
}
