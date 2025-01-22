let device;
let context;
let outputNode;

// 4 Sequenzen mit 32 Steps & 4 Sequenzen mit 16 Steps
let sequences = {
    seq1: Array(32).fill(0),
    seq2: Array(32).fill(0),
    seq3: Array(32).fill(0),
    seq4: Array(32).fill(0),
    seq5: Array(16).fill(0), // Neue Sequenz
    seq6: Array(16).fill(0), // Neue Sequenz
    seq7: Array(16).fill(0), // Neue Sequenz
    seq8: Array(16).fill(0)  // Neue Sequenz
};

async function setup() {
    console.log("Setup wird gestartet...");
    const patchExportURL = "https://stu-philtreezs-projects.vercel.app/export/patch.export.json";

    context = null;
    outputNode = null;

    try {
        const response = await fetch(patchExportURL);
        const patcher = await response.json();

        if (!window.RNBO) {
            console.log("Lade RNBO-Bibliothek...");
            await loadRNBOScript(patcher.desc.meta.rnboversion);
        }

        document.body.addEventListener("click", startAudioContext, { once: true });

    } catch (error) {
        console.error("Fehler beim Laden oder Erstellen des RNBO-Devices:", error);
    }
}

function startAudioContext() {
    console.log("Benutzerinteraktion erkannt. Starte AudioContext...");
    const WAContext = window.AudioContext || window.webkitAudioContext;
    context = new WAContext();
    outputNode = context.createGain();
    outputNode.connect(context.destination);

    createRNBODevice();
}

async function createRNBODevice() {
    try {
        const response = await fetch("https://stu-philtreezs-projects.vercel.app/export/patch.export.json");
        const patcher = await response.json();

        device = await RNBO.createDevice({ context, patcher });
        device.node.connect(outputNode);

        console.log("RNBO-Device erfolgreich erstellt.");
        console.log("🔍 RNBO Messages:", device.messages);

        setupSequenceButtons();
        setupPlayButton();
        trackStepParameters(); // ✅ Stelle sicher, dass der richtige Name hier verwendet wird!
        setupRNBOEventListener();

    } catch (error) {
        console.error("Fehler beim Erstellen des RNBO-Devices:", error);
    }
}

function setupSequenceButtons() {
    Object.keys(sequences).forEach((seq) => {
        if (seq === "seq6") return; // ⛔ seq6 überspringen (weil sie Sliders nutzt!)

        for (let i = 0; i < sequences[seq].length; i++) {
            const divButton = document.getElementById(`btn-${seq}-${i}`);
            if (divButton) {
                divButton.style.cursor = "pointer";
                divButton.innerText = sequences[seq][i]; 

                divButton.addEventListener("click", () => {
                    sequences[seq][i] = sequences[seq][i] === 0 ? 1 : 0;
                    divButton.innerText = sequences[seq][i];
                    console.log(`Button ${seq}-${i} geklickt! Neue Sequenz für ${seq}:`, sequences[seq]);
                    sendSequenceToRNBO(seq);
                });
            } else {
                console.warn(`⚠️ DIV-Button btn-${seq}-${i} nicht gefunden`);
            }
        }
    });
}


function sendSequenceToRNBO(seq) {
    if (!device) {
        console.error(`❌ RNBO-Device nicht geladen. Warte 1 Sekunde und versuche erneut für ${seq}...`);
        setTimeout(() => sendSequenceToRNBO(seq), 1000);
        return;
    }

    const stepCount = sequences[seq].length;
    if (![16, 32].includes(stepCount)) {
        console.error(`❌ Fehler: Die Sequenz ${seq} hat nicht genau 16 oder 32 Werte!`, sequences[seq]);
        return;
    }

    const formattedSequence = sequences[seq].map(Number);
    const event = new RNBO.MessageEvent(RNBO.TimeNow, seq, formattedSequence);
    device.scheduleEvent(event);

    console.log(`📡 Gesendete Sequenz an RNBO (${seq}):`, formattedSequence);
}

// ------ play-Button Steuerung ------
function setupPlayButton() {
    const playButton = document.getElementById("play");

    if (!device) {
        console.error("❌ RNBO-Device nicht geladen. Play-Button kann nicht gesetzt werden.");
        return;
    }

    const playParam = device.parametersById.get("play");

    if (playButton && playParam) {
        playButton.addEventListener("click", () => {
            const newValue = playParam.value === 0 ? 1 : 0;
            playParam.value = newValue;
            console.log(`🎛️ Play state set to: ${newValue}`);
        });
    } else {
        console.error("❌ Play-Button oder Parameter nicht gefunden.");
    }
}



const sliders = [
    { id: "rotary1", parameter: "rotary1" },
    { id: "rotary2", parameter: "rotary2" },
    { id: "rotary3", parameter: "rotary3" }, // Weitere Slider hier hinzufügen
    { id: "rotary4", parameter: "rotary4" },
    { id: "rotary5", parameter: "rotary5" },
    { id: "rotary6", parameter: "rotary6" },
    { id: "rotary7", parameter: "rotary7" },
    { id: "rotary8", parameter: "rotary8" },
    { id: "rotary9", parameter: "rotary9" },
    { id: "rotary10", parameter: "rotary10" },
    { id: "rotary11", parameter: "rotary11" },
    { id: "rotary12", parameter: "rotary12" },
    { id: "rotary13", parameter: "rotary13" },
    { id: "rotary14", parameter: "rotary14" },
    { id: "rotary15", parameter: "rotary15" },
    { id: "rotary16", parameter: "rotary16" },
    { id: "rotary17", parameter: "rotary17" },
    { id: "rotary18", parameter: "rotary18" },
    { id: "rotary19", parameter: "rotary19" },
    { id: "rotary20", parameter: "rotary20" },
    { id: "rotary21", parameter: "rotary21" },
    { id: "rotary22", parameter: "rotary22" },
    { id: "rotary23", parameter: "rotary23" },
    { id: "rotary24", parameter: "rotary24" },
    { id: "rotary25", parameter: "rotary25" },
    { id: "rotary26", parameter: "rotary26" },
    { id: "rotary27", parameter: "rotary27" },
    { id: "rotary28", parameter: "rotary28" },
    { id: "rotary29", parameter: "rotary29" },
    { id: "rotary30", parameter: "rotary30" },
    { id: "rotary31", parameter: "rotary31" },
    { id: "rotary32", parameter: "rotary32" },
];

const totalFrames = 50; // Anzahl der Frames im PNG-Strip
const sliderHeight = 200; // Höhe eines Frames in px

sliders.forEach((slider) => {
    const sliderDiv = document.getElementById(slider.id);
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentValue = 0; // Wert des Parameters (0–1)

    if (!sliderDiv) {
        console.error(`❌ Slider mit ID '${slider.id}' nicht gefunden.`);
        return;
    }

    // Slider-Styles setzen
    sliderDiv.style.width = "200px";
    sliderDiv.style.height = `${sliderHeight}px`;
    sliderDiv.style.backgroundImage = "url('https://cdn.prod.website-files.com/678f73ac8b740d83e9294854/678fbf116dd6a225da9f66ec_slider_200_10000_50_pix.png')"; // Pfad zum PNG-Strip
    sliderDiv.style.backgroundSize = `200px ${sliderHeight * totalFrames}px`;
    sliderDiv.style.backgroundPositionY = "0px";

    // Maus-Interaktionen
    sliderDiv.addEventListener("mousedown", (event) => {
        isDragging = true;
        startX = event.clientX;
        startY = event.clientY;
    });

    window.addEventListener("mousemove", (event) => {
        if (!isDragging) return;

        const deltaX = event.clientX - startX; // Horizontal
        const deltaY = startY - event.clientY; // Vertikal (umgekehrte Richtung)

        // Kombinierte Bewegung in beide Richtungen
        const deltaCombined = (deltaX + deltaY) / 2; // Gewichtung 50/50
        const stepChange = deltaCombined / 70; // Empfindlichkeit (größer = langsamer)

        currentValue = Math.min(Math.max(currentValue + stepChange, 0), 1); // Begrenzen auf 0–1

        // Hintergrundposition im PNG-Strip aktualisieren
        const currentFrame = Math.floor(currentValue * (totalFrames - 1)); // Wert in Frame umrechnen
        const frameOffset = currentFrame * sliderHeight;
        sliderDiv.style.backgroundPositionY = `-${frameOffset}px`;

        // RNBO-Parameter aktualisieren
        updateRNBOParameter(slider.parameter, currentValue);

        // Startposition aktualisieren
        startX = event.clientX;
        startY = event.clientY;
    });

    window.addEventListener("mouseup", () => {
        isDragging = false;
    });
});

function updateRNBOParameter(parameter, value) {
    if (!device) {
        console.error(`❌ RNBO-Device nicht geladen. Parameter '${parameter}' kann nicht gesetzt werden.`);
        return;
    }

    const param = device.parametersById.get(parameter);
    if (param) {
        param.value = value;
        console.log(`🎛️ Wert von '${parameter}' auf ${value.toFixed(2)} gesetzt.`);
    } else {
        console.error(`❌ Parameter '${parameter}' nicht gefunden.`);
    }
}

// 🔹 16 Rotary Sliders für seq6 definieren
const seq6Sliders = [];
for (let i = 0; i < 16; i++) {
    seq6Sliders.push({ id: `seq6-slider-${i}`, parameter: `seq6-${i}` });
}

// 🔹 Initialisierung der 16 Sliders für seq6
seq6Sliders.forEach((slider, index) => {
    const sliderDiv = document.getElementById(slider.id);
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentValue = sequences.seq6[index]; // Startwert für diesen Slider setzen

    if (!sliderDiv) {
        console.error(`❌ Slider mit ID '${slider.id}' nicht gefunden.`);
        return;
    }

    // 🟢 Initiale Darstellung setzen
    const currentFrame = Math.floor(currentValue * (totalFrames - 1));
    const frameOffset = currentFrame * sliderHeight;
    sliderDiv.style.backgroundPositionY = `-${frameOffset}px`;

    // Slider-Styles setzen
    sliderDiv.style.width = "200px";
    sliderDiv.style.height = `${sliderHeight}px`;
    sliderDiv.style.backgroundImage = "url('https://cdn.prod.website-files.com/678f73ac8b740d83e9294854/678fbf116dd6a225da9f66ec_slider_200_10000_50_pix.png')";
    sliderDiv.style.backgroundSize = `200px ${sliderHeight * totalFrames}px`;
    sliderDiv.style.backgroundPositionY = `-${Math.floor(currentValue * (totalFrames - 1)) * sliderHeight}px`;

    // Maus-Interaktionen
    sliderDiv.addEventListener("mousedown", (event) => {
        isDragging = true;
        startX = event.clientX;
        startY = event.clientY;
    });

    window.addEventListener("mousemove", (event) => {
        if (!isDragging) return;

        const deltaX = event.clientX - startX;
        const deltaY = startY - event.clientY;
        const deltaCombined = (deltaX + deltaY) / 2;
        const stepChange = deltaCombined / 20;

        currentValue = Math.min(Math.max(currentValue + stepChange, 0), 1);
        sequences.seq6[index] = currentValue; // Wert in Liste speichern

        // Hintergrundposition im PNG-Strip aktualisieren
        const currentFrame = Math.floor(currentValue * (totalFrames - 1));
        const frameOffset = currentFrame * sliderHeight;
        sliderDiv.style.backgroundPositionY = `-${frameOffset}px`;

        sendSeq6ToRNBO(); // Aktualisierte Liste senden

        startX = event.clientX;
        startY = event.clientY;
    });

    window.addEventListener("mouseup", () => {
        isDragging = false;
    });
});



// 🔹 Funktion zur Aktualisierung aller drei Step-Visualisierungen
function updateStepVisualizations(step, step16, step16alt) {
    // 1️⃣ Haupt-Visualisierung für 32 Steps (0-31)
    for (let i = 0; i < 32; i++) {
        const stepDiv = document.getElementById(`step-${i}`);
        if (stepDiv) {
            stepDiv.style.opacity = i === step ? "1" : "0";
        }
    }

    // 2️⃣ Erste 16-Step-Visualisierung (step16)
    for (let i = 0; i < 16; i++) {
        const stepDiv = document.getElementById(`step16-${i}`);
        if (stepDiv) {
            stepDiv.style.opacity = i === step16 ? "1" : "0";
        }
    }

    // 3️⃣ Zweite 16-Step-Visualisierung (step16alt)
    for (let i = 0; i < 16; i++) {
        const stepDiv = document.getElementById(`step16alt-${i}`);
        if (stepDiv) {
            stepDiv.style.opacity = i === step16alt ? "1" : "0";
        }
    }
}

// 🔹 Step-Tracking für "step", "step16" und "step16alt"
function trackStepParameters() {
    if (!device) {
        console.error("❌ RNBO-Device nicht geladen. Step-Tracking nicht möglich.");
        return;
    }

    const stepParam = device.parametersById.get("step");
    const step16Param = device.parametersById.get("step16");
    const step16altParam = device.parametersById.get("step16alt");

    if (!stepParam || !step16Param || !step16altParam) {
        console.error("❌ Ein oder mehrere Step-Parameter ('step', 'step16', 'step16alt') nicht gefunden.");
        return;
    }

    setInterval(() => {
        const stepValue = Math.floor(stepParam.value);      // 0-31
        const step16Value = Math.floor(step16Param.value);  // 0-15
        const step16altValue = Math.floor(step16altParam.value); // 0-15

        console.log(`🎛️ Steps - step: ${stepValue} | step16: ${step16Value} | step16alt: ${step16altValue}`);
        updateStepVisualizations(stepValue, step16Value, step16altValue);
    }, 10);
}

// 🔹 Event Listener für RNBO
function setupRNBOEventListener() {
    if (!device) {
        console.error("RNBO-Device nicht geladen, keine Events abonniert.");
        return;
    }

    device.messageEvent.subscribe((ev) => {
        console.log(`📡 Empfangenes RNBO-Event: ${ev.tag}:`, ev.payload);

        let stepValue = device.parametersById.get("step") ? Math.floor(device.parametersById.get("step").value) : 0;
        let step16Value = device.parametersById.get("step16") ? Math.floor(device.parametersById.get("step16").value) : 0;
        let step16altValue = device.parametersById.get("step16alt") ? Math.floor(device.parametersById.get("step16alt").value) : 0;

        if (ev.tag === "step") stepValue = parseInt(ev.payload, 10);
        if (ev.tag === "step16") step16Value = parseInt(ev.payload, 10);
        if (ev.tag === "step16alt") step16altValue = parseInt(ev.payload, 10);

        updateStepVisualizations(stepValue, step16Value, step16altValue);
    });
}

// 🔹 Funktion zum Senden der vollständigen 16-Float-Wert-Liste an seq6 in RNBO
function sendSeq6ToRNBO() {
    if (!device) {
        console.error(`❌ RNBO-Device ist noch nicht geladen. Warte 1 Sekunde und versuche erneut für seq6...`);
        setTimeout(() => sendSeq6ToRNBO(), 1000);
        return;
    }

    if (sequences.seq6.length !== 16) {
        console.error(`❌ Fehler: Die Sequenz seq6 hat nicht genau 16 Werte!`, sequences.seq6);
        return;
    }

    const formattedSequence = sequences.seq6.map(Number);
    const event = new RNBO.MessageEvent(RNBO.TimeNow, "seq6", formattedSequence);
    device.scheduleEvent(event);

    console.log(`📡 Gesendete Sequenz an RNBO (seq6):`, formattedSequence);
}



async function loadRNBOScript(version) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://js.cdn.cycling74.com/rnbo/${encodeURIComponent(version)}/rnbo.min.js`;
        script.onload = () => {
            console.log("RNBO-Bibliothek erfolgreich geladen.");
            resolve();
        };
        script.onerror = () => reject(new Error("Fehler beim Laden der RNBO-Bibliothek."));
        document.body.appendChild(script);
    });
}

setup();
