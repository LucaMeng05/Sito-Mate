// script.js
// Carica le sequenze da JSON e mostra una casuale nella home

let sequenze = [];
let sequenzaCorrente = null;

// Carica il file JSON
fetch('sequences.json')
  .then(response => response.json())
  .then(data => {
      sequenze = data;
      generaSequenzaHome();
  })
  .catch(err => console.error('Errore nel caricamento del JSON:', err));

function generaSequenzaHome() {
    if (sequenze.length === 0) return;

    // Pesca una sequenza casuale
    let index = Math.floor(Math.random() * sequenze.length);
    sequenzaCorrente = sequenze[index];

    // Mostra nel box
    document.getElementById('sequenzaBox').innerText = sequenzaCorrente.sequence.join(', ') + ', ?';
}

// Controlla la risposta inserita dall'utente
function controllaRisposta() {
    let userAnswer = document.getElementById('rispostaUtente').value;
    let feedbackBox = document.getElementById('feedback');

    if (!sequenzaCorrente) {
        feedbackBox.innerText = 'Nessuna sequenza caricata.';
        return;
    }

    if (Number(userAnswer) === sequenzaCorrente.answer) {
        feedbackBox.innerText = '✅ Corretto!';
    } else {
        feedbackBox.innerText = '❌ Sbagliato! La risposta corretta è: ' + sequenzaCorrente.answer;
    }
}

