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
    const playButton = document.getElementById("play");
    const playParam = device.parametersById.get("play");

    if (playButton && playParam) {
        playButton.addEventListener("click", () => {
            const newValue = playParam.value === 0 ? 1 : 0;
            playParam.value = newValue;
            console.log(`play state set to: ${newValue}`);
        });
    }

// 🔹 Funktion zur Aktualisierung der Step-Visualisierung
function updateStepVisualization(step) {
    for (let i = 0; i < 32; i++) {
        const stepDiv = document.getElementById(`step-${i}`);
        if (stepDiv) {
            stepDiv.style.opacity = i === step ? "1" : "0"; // Aktiver Step sichtbar, andere unsichtbar
        }
    }
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
