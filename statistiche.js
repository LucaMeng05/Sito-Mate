import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
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

const eloDisplay = document.getElementById("eloUtenteStat");
const ctx = document.getElementById('eloChart').getContext('2d');

let userUid = null;
let chart = null;

// Login
async function login() {
  try {
    const result = await signInWithPopup(auth, provider);
    userUid = result.user.uid;
    caricaStatistiche();
  } catch(err){ console.error(err); }
}

onAuthStateChanged(auth, async user => {
  if(!user) await login();
  else {
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
  const giorni = Object.keys(storicoELO);
  const valori = Object.values(storicoELO);
  
  if(chart) {
    chart.destroy();
  }
  
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: giorni.map(g => `Giorno ${g}`),
      datasets: [{
        label: 'ELO',
        data: valori,
        borderColor: '#4a6fa5',
        backgroundColor: 'rgba(74, 111, 165, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { family: "'Georgia', serif", size: 14 },
          bodyFont: { family: "'Georgia', serif", size: 14 }
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
            font: { family: "'Georgia', serif", size: 12 }
          }
        },
        x: {
          grid: { 
            color: 'rgba(0,0,0,0.1)',
            drawBorder: false
          },
          ticks: {
            font: { family: "'Georgia', serif", size: 12 }
          }
        }
      }
    }
  });
}
