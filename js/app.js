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
        setupRNBOEventListener();
        setupSequenceButtons();
        setupPlayButton();
        setupRecButton();
        setupRndmButton();
        setupSliders(device);
        trackStepParameters(); // ✅ Stelle sicher, dass der richtige Name hier verwendet wird!

    } catch (error) {
        console.error("Fehler beim Erstellen des RNBO-Devices:", error);
    }
}

function setupRNBOEventListener() {
    if (!device) {
        console.error("❌ RNBO-Device nicht geladen. Event-Listener kann nicht registriert werden.");
        return;
    }

    device.parameterChangeEvent.subscribe((param) => {
        console.log(`🔄 Event von RNBO: ${param.id} → ${param.value}`); // <== DEBUG

        // Falls es sich um einen Slider handelt, finde das zugehörige Element
        const slider = sliders.find(s => s.parameter === param.id);
        if (slider) {
            const sliderDiv = document.getElementById(slider.id);
            if (sliderDiv) {
                updateSliderPosition(sliderDiv, param.value);
            }
        }
    });
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

// ------ rndm-Button Steuerung ------
function setupRndmButton() {
    const rndmButton = document.getElementById("rndm");

    if (!device) {
        console.error("❌ RNBO-Device nicht geladen. rndm-Button kann nicht gesetzt werden.");
        return;
    }

    const rndmParam = device.parametersById.get("rndm");

    if (rndmButton && rndmParam) {
        rndmButton.addEventListener("click", () => {
            const newValue = rndmParam.value === 0 ? 1 : 0;
            rndmParam.value = newValue;
            console.log(`🎛️ Rndm state set to: ${newValue}`);
        });
    } else {
        console.error("❌ Rndm-Button oder Parameter nicht gefunden.");
    }
}

async function initializeUI() {
    await waitForDevice(); // Sicherstellen, dass `device` geladen ist

    console.log("✅ Initialisiere Playstat-Bar...");

    const playstatParam = device?.parametersById?.get("playstat");
    const playstatBar = document.getElementById("playstat-bar");

    console.log("🔍 Parameter playstat:", playstatParam);
    console.log("🔍 Playstat-Bar gefunden:", playstatBar);

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
        console.log(`🔄 Event erhalten: ${param.id} → ${param.value}`); // Debugging

        if (param.id === playstatParam.id) {
            const value = param.value; // Wert zwischen 0.0 und 1.0
            const widthPercentage = value * 100; // In Prozent umwandeln
            playstatBar.style.width = `${widthPercentage}%`; // Setzen der Breite
            console.log(`📊 Playstat-Bar Breite gesetzt: ${widthPercentage}%`);
        }
    });
}

setup().then(() => {
    setupSliders(device).then(() => {
        initializeUI();
    });
});





const sliders = Array.from({ length: 44 }, (_, i) => ({
    id: `rotary${i + 1}`,
    parameter: `rotary${i + 1}`
}));

const totalFrames = 50; // Anzahl der Frames im PNG-Strip
const sliderHeight = 200; // Höhe eines Frames in px

async function setupSliders(rnboDevice) {
    device = rnboDevice; // RNBO-Device speichern

    sliders.forEach((slider) => {
        const sliderDiv = document.getElementById(slider.id);
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let currentValue = 0;

        if (!sliderDiv) {
            console.error(`❌ Slider mit ID '${slider.id}' nicht gefunden.`);
            return;
        }

        // 🔹 Slider-Styles setzen
        sliderDiv.style.width = "200px";
        sliderDiv.style.height = `${sliderHeight}px`;
        sliderDiv.style.backgroundImage = "url('https://cdn.prod.website-files.com/678f73ac8b740d83e9294854/678fbf116dd6a225da9f66ec_slider_200_10000_50_pix.png')";
        sliderDiv.style.backgroundSize = `200px ${sliderHeight * totalFrames}px`;
        sliderDiv.style.backgroundPositionY = "0px";

        // 🔹 RNBO-Parameter abrufen
        const param = device.parametersById.get(slider.parameter);
        if (param) {
            // 🔹 Wenn der RNBO-Wert sich ändert, aktualisiere den Slider optisch
            param.onValueChange = (newValue) => {
                console.log(`🎛️ RNBO-Parameter '${slider.parameter}' geändert: ${newValue}`);
                updateSliderPosition(sliderDiv, newValue);
            };

            // 🔹 Initialen Wert aus RNBO holen & Slider setzen
            updateSliderPosition(sliderDiv, param.value);
        }

        // 🔹 Maus-Interaktion für manuelle Slider-Steuerung
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
            updateSliderPosition(sliderDiv, currentValue);
            updateRNBOParameter(slider.parameter, currentValue);

            startX = event.clientX;
            startY = event.clientY;
        });

        window.addEventListener("mouseup", () => {
            isDragging = false;
        });
    });
}

// **Slider-Position basierend auf RNBO-Wert setzen**
function updateSliderPosition(sliderDiv, value) {
    const currentFrame = Math.floor(value * (totalFrames - 1));
    const frameOffset = currentFrame * sliderHeight;
    sliderDiv.style.backgroundPositionY = `-${frameOffset}px`;
}

// **RNBO-Parameter aktualisieren**
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
