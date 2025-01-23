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
    seq8: Array(16).fill(0),  // Neue Sequenz
    seq9: Array(16).fill(0)
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

        startWaveformVisualization(device, context); // 👈 Hier aufrufen!
        setupSequenceButtons();
        setupPlayButton();
        setupRecButton();
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

document.addEventListener("DOMContentLoaded", () => {
    // Wähle alle 16 Number-Boxen aus
    const numberBoxes = document.querySelectorAll(".number-box");

    // Initiale Werte setzen (aus seq9)
    numberBoxes.forEach((box, index) => {
        box.value = sequences.seq9[index]; // Falls du Standardwerte hast
    });

    // Funktion zum Aktualisieren der Werte
    function updateSeq9() {
        let values = [];
        numberBoxes.forEach((box, index) => {
            let value = parseInt(box.value, 10); // Integer auslesen
            value = Math.min(Math.max(value, 0), 8); // Begrenzen auf 0-8
            sequences.seq9[index] = value;
            values.push(value);
        });

        // Werte an RNBO senden
        sendSequenceToRNBO("seq9");
    }

    // Event-Listener für Änderungen in den Boxen
    numberBoxes.forEach((box) => {
        box.addEventListener("change", updateSeq9);
    });
});



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

// ------ rec-Button Steuerung ------
function setupRecButton() {
    const recButton = document.getElementById("rec");

    if (!device) {
        console.error("❌ RNBO-Device nicht geladen. Play-Button kann nicht gesetzt werden.");
        return;
    }

    const recParam = device.parametersById.get("rec");

    if (recButton && recParam) {
        recButton.addEventListener("click", () => {
            const newValue = recParam.value === 0 ? 1 : 0;
            recParam.value = newValue;
            console.log(`🎛️ Rec state set to: ${newValue}`);
        });
    } else {
        console.error("❌ Play-Button oder Parameter nicht gefunden.");
    }
}

// 🔹 Warten, bis `device` geladen ist
async function waitForDevice() {
    while (!device) {
        console.warn("⏳ Warten auf RNBO-Device...");
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log("✅ RNBO-Device geladen!");
}

// 🔹 Playstat-Balken initialisieren
async function initializeUI() {
    await waitForDevice(); // Stelle sicher, dass `device` bereit ist

    const playstatParam = device.parametersById.get("playstat");
    const playstatBar = document.getElementById("playstat-bar");

    if (!playstatParam) {
        console.error("❌ Parameter 'playstat' nicht gefunden.");
        return;
    }
    if (!playstatBar) {
        console.error("❌ Playstat-Bar-Element nicht gefunden.");
        return;
    }

    console.log("🎛️ Playstat-Tracking gestartet!");

    // 🔹 Playstat-Änderungen verfolgen
    device.parameterChangeEvent.subscribe((param) => {
        if (param.id === playstatParam.id) {
            const value = param.value; // Wert zwischen 0.0 und 1.0
            const widthPercentage = value * 100; // In Prozent umwandeln
            playstatBar.style.width = `${widthPercentage}%`; // Setzen der Breite
            console.log(`📊 Playstat-Bar Breite gesetzt: ${widthPercentage}%`);
        }
    });
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
    { id: "rotary33", parameter: "rotary33" },
    { id: "rotary34", parameter: "rotary34" },
    { id: "rotary35", parameter: "rotary35" },
    { id: "rotary36", parameter: "rotary36" },
    { id: "rotary37", parameter: "rotary37" },
    { id: "rotary38", parameter: "rotary38" },
    { id: "rotary39", parameter: "rotary39" },
    { id: "rotary40", parameter: "rotary40" },
    { id: "rotary41", parameter: "rotary41" },
    { id: "rotary42", parameter: "rotary42" },
    { id: "rotary43", parameter: "rotary43" },
    { id: "rotary44", parameter: "rotary44" },
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

/// 🔹 16 Rotary Sliders für seq6 und seq8 definieren
const seq6Sliders = [];
const seq8Sliders = [];

for (let i = 0; i < 16; i++) {
    seq6Sliders.push({ id: `seq6-slider-${i}` });
    seq8Sliders.push({ id: `seq8-slider-${i}` });
}

// 🟢 Initialisierung der 16 Sliders für seq6
function initializeSliders(sliders, sequenceKey) {
    sliders.forEach((slider, index) => {
        const sliderDiv = document.getElementById(slider.id);
        let isDragging = false;
        let startX = 0;
        let startY = 0;

        if (!sliderDiv) {
            console.error(`❌ Slider mit ID '${slider.id}' nicht gefunden.`);
            return;
        }

        // Initialen Wert aus der Sequence setzen
        let currentValue = sequences[sequenceKey] ? sequences[sequenceKey][index] : 0;

        // 🟢 Initiale Darstellung setzen
        const currentFrame = Math.floor(currentValue * (totalFrames - 1));
        const frameOffset = currentFrame * sliderHeight;
        sliderDiv.style.backgroundPositionY = `-${frameOffset}px`;

        // Slider-Styles setzen
        sliderDiv.style.width = "200px";
        sliderDiv.style.height = `${sliderHeight}px`;
        sliderDiv.style.backgroundImage = "url('https://cdn.prod.website-files.com/678f73ac8b740d83e9294854/678fbf116dd6a225da9f66ec_slider_200_10000_50_pix.png')";
        sliderDiv.style.backgroundSize = `200px ${sliderHeight * totalFrames}px`;

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
            const stepChange = deltaCombined / 70;

            currentValue = Math.min(Math.max(currentValue + stepChange, 0), 1);
            sequences[sequenceKey][index] = currentValue; // Wert in Sequence speichern

            const newFrame = Math.floor(currentValue * (totalFrames - 1));
            const newOffset = newFrame * sliderHeight;
            sliderDiv.style.backgroundPositionY = `-${newOffset}px`;

            sendSequenceToRNBO(sequenceKey);

            startX = event.clientX;
            startY = event.clientY;
        });

        window.addEventListener("mouseup", () => {
            isDragging = false;
        });
    });
}

// 🔵 16 Werte für seq9 initialisieren (Nummern-Boxen 0-8)
sequences.seq9 = Array(16).fill(0); // Standardwerte = 0

// 🟢 Nummern-Boxen für seq9 erzeugen und initialisieren
function initializeSeq9NumberBoxes() {
    for (let i = 0; i < 16; i++) {
        const numBox = document.getElementById(`seq9-box-${i}`);
        if (!numBox) {
            console.error(`❌ Nummern-Box mit ID 'seq9-box-${i}' nicht gefunden.`);
            continue;
        }

        numBox.value = sequences.seq9[i]; // Initialwert setzen
        numBox.min = 0;
        numBox.max = 8;
        numBox.step = 1;

        numBox.addEventListener("change", (event) => {
            const newValue = Math.min(Math.max(parseInt(event.target.value, 10), 0), 8); // Begrenzen auf 0–8
            sequences.seq9[i] = newValue; // Wert in seq9 speichern
            console.log(`🔢 Nummern-Box seq9-${i} geändert: Neuer Wert = ${newValue}`);
            sendSequenceToRNBO("seq9"); // Sequenz an RNBO senden
        });
    }
}

// 🔹 RNBO-Event für seq9 senden
function sendSequenceToRNBO(seq) {
    if (!device) {
        console.error(`❌ RNBO-Device nicht geladen. Warte 1 Sekunde und versuche erneut für ${seq}...`);
        setTimeout(() => sendSequenceToRNBO(seq), 1000);
        return;
    }

    if (sequences[seq].length !== 16) {
        console.error(`❌ Fehler: Die Sequenz ${seq} hat nicht genau 16 Werte!`, sequences[seq]);
        return;
    }

    const formattedSequence = sequences[seq].map(Number);
    const event = new RNBO.MessageEvent(RNBO.TimeNow, seq, formattedSequence);
    device.scheduleEvent(event);

    console.log(`📡 Gesendete Sequenz an RNBO (${seq}):`, formattedSequence);
}

// 🟢 Nummern-Boxen initialisieren
initializeSeq9NumberBoxes();


// 🟢 RNBO-Event senden für seq6 und seq8
function sendSequenceToRNBO(seq) {
    if (!device) {
        console.error(`❌ RNBO-Device nicht geladen. Warte 1 Sekunde und versuche erneut für ${seq}...`);
        setTimeout(() => sendSequenceToRNBO(seq), 1000);
        return;
    }

    if (sequences[seq].length !== 16) {
        console.error(`❌ Fehler: Die Sequenz ${seq} hat nicht genau 16 Werte!`, sequences[seq]);
        return;
    }

    const formattedSequence = sequences[seq].map(Number);
    const event = new RNBO.MessageEvent(RNBO.TimeNow, seq, formattedSequence);
    device.scheduleEvent(event);

    console.log(`📡 Gesendete Sequenz an RNBO (${seq}):`, formattedSequence);
}

// Initialisierung aufrufen
initializeSliders(seq6Sliders, "seq6");
initializeSliders(seq8Sliders, "seq8");



function updateStepVisualizations(step, step16, step16alt) {
    // 🔹 Existierende 32-Step Visualisierung
    for (let i = 0; i < 32; i++) {
        const stepDiv = document.getElementById(`step-${i}`);
        if (stepDiv) {
            stepDiv.style.opacity = i === step ? "1" : "0";
        }
    }

    // 🔹 Existierende 16-Step Visualisierung (step16)
    for (let i = 0; i < 16; i++) {
        const stepDiv = document.getElementById(`step16-${i}`);
        if (stepDiv) {
            stepDiv.style.opacity = i === step16 ? "1" : "0";
        }
    }

    // 🔹 Existierende 16-Step Visualisierung (step16alt)
    for (let i = 0; i < 16; i++) {
        const stepDiv = document.getElementById(`step16alt-${i}`);
        if (stepDiv) {
            stepDiv.style.opacity = i === step16alt ? "1" : "0";
        }
    }

    // 🔥 NEU: Steuerung aller Divs mit der Klasse "step16-extra"
    document.querySelectorAll(".step16-extra").forEach((element, index) => {
        element.style.opacity = index === step16 ? "1" : "0";
    });    
    
    document.querySelectorAll(".step16-extra2").forEach((element, index) => {
        element.style.opacity = index === step16 ? "1" : "0";
    });

    document.querySelectorAll(".step16-extra3").forEach((element, index) => {
        element.style.opacity = index === step16alt ? "1" : "0";
    });
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


// Funktion zum Starten der Visualisierung
async function startWaveformVisualization(device, context) {
    const bufferDescription = device.dataBufferDescriptions.find(desc => desc.id === "lulu");
    if (!bufferDescription) {
        console.error("Buffer 'lulu' not found in RNBO device.");
        return;
    }

    try {
        const dataBuffer = await device.releaseDataBuffer(bufferDescription.id);
        const audioBuffer = await dataBuffer.getAsAudioBuffer(context);
        const canvas = document.getElementById("waveformCanvas");

        if (!canvas || !canvas.getContext) {
            console.error("waveformCanvas not found or not a valid canvas element.");
            return;
        }

        const ctx = canvas.getContext("2d");

        function draw() {
            const channelData = audioBuffer.getChannelData(0);
            const step = Math.ceil(channelData.length / canvas.width); // Schrittgröße pro Pixel
            const amp = canvas.height / 4;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.moveTo(0, amp);

            for (let i = 0; i < canvas.width; i++) {
                const min = channelData[i * step];
                const max = channelData[i * step];
                ctx.lineTo(i, amp + min * amp);
                ctx.lineTo(i, amp + max * amp);
            }

            ctx.strokeStyle = "rgb(0, 255, 130)";
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        draw(); // Einmalige Visualisierung nach Aufnahmeende

        // Buffer wieder in den RNBO-Patcher laden, um Abspielen zu ermöglichen
        await device.setDataBuffer(bufferDescription.id, audioBuffer);

    } catch (error) {
        console.error("Error retrieving audio buffer:", error);
    }
}

// Setup-Funktion aufrufen
setup();

// 🔄 **Regelmäßige Aktualisierung alle 1000ms (1 Sekunde)**
setInterval(() => {
    if (device && context) {
        startWaveformVisualization(device, context);
    }
}, 107);
