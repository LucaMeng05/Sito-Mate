// SCRIPT.JS
// Genera una sequenza casuale per la home page

function generaSequenzaHome() {
    // Tipologie di sequenze
    const tipi = ["aritmetica", "geometrica", "alternata", "quadratica"];    
    const tipo = tipi[Math.floor(Math.random() * tipi.length)];

    let seq = [];

    switch (tipo) {
        case "aritmetica":
            let startA = Math.floor(Math.random() * 10) + 1;
            let step = Math.floor(Math.random() * 5) + 1;
            for (let i = 0; i < 5; i++) seq.push(startA + i * step);
            break;

        case "geometrica":
            let startG = Math.floor(Math.random() * 5) + 1;
            let ratio = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < 5; i++) seq.push(startG * Math.pow(ratio, i));
            break;

        case "alternata":
            let a1 = Math.floor(Math.random() * 10) + 1;
            let a2 = Math.floor(Math.random() * 5) + 1;
            for (let i = 0; i < 5; i++) seq.push(i % 2 === 0 ? a1 + i : a2 + i * 2);
            break;

        case "quadratica":
            let c = Math.floor(Math.random() * 3) + 1;
            for (let i = 1; i <= 5; i++) seq.push(c * i * i);
            break;
    }

    document.getElementById("sequenzaBox").innerText = seq.join(", ") + ", ?";
}

// Genera una sequenza appena si carica la pagina
window.onload = () => {
    if (document.getElementById("sequenzaBox")) {
        generaSequenzaHome();
    }
};
