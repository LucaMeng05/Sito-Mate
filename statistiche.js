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
const ctx = document.getElementById('eloChart').getContext('2d');

let userUid = null;
let chart = null;

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
  } else {
    loginModal.classList.remove("active");
    userUid = user.uid;
    caricaStatistiche();
  }
});

// Carica statistiche
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

// Crea grafico
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
      labels: ultime30.map((_, i) => i + 1), // Numeri 1-30 invece di "Giorno X"
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
