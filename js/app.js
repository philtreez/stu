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
        trackStepParameter();
        setupRNBOEventListener();

    } catch (error) {
        console.error("Fehler beim Erstellen des RNBO-Devices:", error);
    }
}

function setupSequenceButtons() {
    Object.keys(sequences).forEach((seq) => {
        const stepCount = sequences[seq].length; // Dynamisch 16 oder 32

        for (let i = 0; i < stepCount; i++) {
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
                console.warn(`DIV-Button btn-${seq}-${i} nicht gefunden`);
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
        const stepChange = deltaCombined / 50; // Empfindlichkeit (größer = langsamer)

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




// 🔹 Funktion zur Aktualisierung der Step-Visualisierungen (0-31 & 0-15)
function updateStepVisualizations(step, step16) {
    // 1️⃣ Aktualisiere die Haupt-Visualisierung (0-31 Steps)
    for (let i = 0; i < 32; i++) {
        const stepDiv = document.getElementById(`step-${i}`);
        if (stepDiv) {
            stepDiv.style.opacity = i === step ? "1" : "0";
        }
    }

    // 2️⃣ Aktualisiere die zweite Visualisierung (0-15 Steps)
    for (let i = 0; i < 16; i++) {
        const stepDiv = document.getElementById(`step16-${i}`);
        if (stepDiv) {
            stepDiv.style.opacity = i === step16 ? "1" : "0";
        }
    }
}

// 🔹 Step-Tracking für "step" und "step16"-Parameter
function trackStepParameters() {
    if (!device) {
        console.error("❌ RNBO-Device nicht geladen. Step-Tracking nicht möglich.");
        return;
    }

    const stepParam = device.parametersById.get("step");
    const step16Param = device.parametersById.get("step16");

    if (!stepParam || !step16Param) {
        console.error("❌ Ein oder beide Step-Parameter ('step', 'step16') nicht gefunden.");
        return;
    }

    setInterval(() => {
        const stepValue = Math.floor(stepParam.value); // 0-31
        const step16Value = Math.floor(step16Param.value); // 0-15
        console.log(`🎛️ Aktueller Step: ${stepValue} | Step16: ${step16Value}`);
        updateStepVisualizations(stepValue, step16Value);
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

        if (ev.tag === "step") {
            const stepValue = parseInt(ev.payload, 10);
            const step16Value = device.parametersById.get("step16") ? Math.floor(device.parametersById.get("step16").value) : 0;
            updateStepVisualizations(stepValue, step16Value);
        }

        if (ev.tag === "step16") {
            const step16Value = parseInt(ev.payload, 10);
            const stepValue = device.parametersById.get("step") ? Math.floor(device.parametersById.get("step").value) : 0;
            updateStepVisualizations(stepValue, step16Value);
        }
    });
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
