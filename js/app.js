let device;
let context;
let outputNode;

// 4 Sequenzen mit je 32 Steps
let sequences = {
    seq1: Array(32).fill(0),
    seq2: Array(32).fill(0),
    seq3: Array(32).fill(0),
    seq4: Array(32).fill(0),
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
        trackStepParameter(); // 🚀 Step-Tracking aktivieren!
        setupRNBOEventListener();

    } catch (error) {
        console.error("Fehler beim Erstellen des RNBO-Devices:", error);
    }
}

function setupSequenceButtons() {
    Object.keys(sequences).forEach((seq, seqIndex) => {
        for (let i = 0; i < 32; i++) {
            const divButton = document.getElementById(`btn-${seq}-${i}`);
            if (divButton) {
                divButton.style.cursor = "pointer";
                divButton.innerText = sequences[seq][i]; // Startwert setzen

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
        console.error(`❌ RNBO-Device ist noch nicht geladen. Warte 1 Sekunde und versuche erneut für ${seq}...`);
        setTimeout(() => sendSequenceToRNBO(seq), 1000);
        return;
    }

    if (sequences[seq].length !== 32) {
        console.error(`❌ Fehler: Die Sequenz ${seq} hat nicht genau 32 Werte!`, sequences[seq]);
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




let isDragging = false;
let startX = 0;
let startY = 0;
let currentValue = 0; // Wert des Parameters (0–1)
const totalFrames = 50; // Anzahl der Frames im PNG-Strip
const sliderHeight = 200; // Höhe eines Frames in px
const rotarySlider = document.getElementById("rotary-slider");

if (rotarySlider) {
    // Slider-Styles setzen
    rotarySlider.style.width = "200px";
    rotarySlider.style.height = `${sliderHeight}px`;
    rotarySlider.style.backgroundImage = "url('https://cdn.prod.website-files.com/678f73ac8b740d83e9294854/678fbf116dd6a225da9f66ec_slider_200_10000_50_pix.png')"; // Pfad zum PNG-Strip
    rotarySlider.style.backgroundSize = `200px ${sliderHeight * totalFrames}px`;
    rotarySlider.style.backgroundPositionY = "0px";

    // Maus-Interaktionen
    rotarySlider.addEventListener("mousedown", (event) => {
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
        rotarySlider.style.backgroundPositionY = `-${frameOffset}px`;

        // RNBO-Parameter aktualisieren
        updateRNBOParameter(currentValue);

        // Startposition aktualisieren
        startX = event.clientX;
        startY = event.clientY;
    });

    window.addEventListener("mouseup", () => {
        isDragging = false;
    });
}

function updateRNBOParameter(value) {
    if (!device) {
        console.error("❌ RNBO-Device nicht geladen. Parameter kann nicht gesetzt werden.");
        return;
    }

    const rotaryParam = device.parametersById.get("rotary"); // Ersetze 'rotary' mit deinem Parameter-Namen
    if (rotaryParam) {
        rotaryParam.value = value;
        console.log(`🎛️ Rotary-Wert auf ${value.toFixed(2)} gesetzt.`);
    } else {
        console.error("❌ Parameter 'rotary' nicht gefunden.");
    }
}



// 🔹 Funktion zur Aktualisierung der Step-Visualisierung
function updateStepVisualization(step) {
    for (let i = 0; i < 32; i++) {
        const stepDiv = document.getElementById(`step-${i}`);
        if (stepDiv) {
            stepDiv.style.opacity = i === step ? "1" : "0"; // Aktiver Step sichtbar, andere unsichtbar
        } else {
            console.warn(`⚠️ Div 'step-${i}' nicht gefunden!`);
        }
    }
}


// 🔹 Step-Tracking für den "step"-Parameter
function trackStepParameter() {
    if (!device) {
        console.error("❌ RNBO-Device nicht geladen. Step-Tracking nicht möglich.");
        return;
    }

    const stepParam = device.parametersById.get("step");

    if (!stepParam) {
        console.error("❌ Parameter 'step' nicht gefunden.");
        return;
    }

    setInterval(() => {
        const stepValue = Math.floor(stepParam.value); // Ganzzahl sicherstellen
        console.log(`🎛️ Aktueller Step: ${stepValue}`);
        updateStepVisualization(stepValue);
    }, 10); // Alle 100ms prüfen
}

function setupRNBOEventListener() {
    if (!device) {
        console.error("RNBO-Device nicht geladen, keine Events abonniert.");
        return;
    }

    device.messageEvent.subscribe((ev) => {
        console.log(`📡 Empfangenes RNBO-Event: ${ev.tag}:`, ev.payload);

        if (ev.tag === "step") {
            const stepValue = parseInt(ev.payload, 10);
            updateStepVisualization(stepValue);
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
