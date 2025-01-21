let device;
let context;
let outputNode;
let sequence = Array(8).fill(0); // Immer eine Liste mit 8 Werten

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
        console.log("🔍 RNBO Messages:", device.messages); // Prüfen, ob seq existiert

        setupPlayButton();
        setupSequenceButtons();
        setupRNBOEventListener();

        // 📡 Debugging für alle Events aus RNBO (einschließlich debug!)
        device.messageEvent.subscribe((ev) => {
            console.log(`📡 Empfangenes RNBO-Event: ${ev.tag}:`, ev.payload);
        });

    } catch (error) {
        console.error("Fehler beim Erstellen des RNBO-Devices:", error);
    }
}


function setupPlayButton() {
    const playButton = document.getElementById("play");

    if (playButton && device) {
        const playParam = device.parametersById.get("play");

        if (playParam) {
            playButton.addEventListener("click", () => {
                const newValue = playParam.value === 0 ? 1 : 0;
                playParam.value = newValue;
                console.log(`play state set to: ${newValue}`);
            });
        } else {
            console.error("Parameter 'play' nicht gefunden.");
        }
    } else {
        console.error("Play-Button oder Device nicht gefunden.");
    }
}

function setupSequenceButtons() {
    for (let i = 0; i < 8; i++) {
        const divButton = document.getElementById(`btn-${i}`);
        if (divButton) {
            divButton.style.cursor = "pointer";
            divButton.innerText = sequence[i]; // Startwert setzen

            divButton.addEventListener("click", () => {
                sequence[i] = sequence[i] === 0 ? 1 : 0;
                divButton.innerText = sequence[i];
                console.log(`Button ${i} geklickt! Neue Sequenz:`, sequence);
                
                sendSequenceToRNBO(); // Sofort die neue Liste senden
            });
        } else {
            console.warn(`DIV-Button btn-${i} nicht gefunden`);
        }
    }
}

function sendSequenceToRNBO() {
    if (!device) {
        console.error("❌ RNBO-Device ist noch nicht geladen. Warte 1 Sekunde und versuche erneut...");
        setTimeout(sendSequenceToRNBO, 1000); // Erneuter Versuch nach 1 Sekunde
        return;
    }

    if (sequence.length !== 8) {
        console.error("❌ Fehler: Die Sequenz hat nicht genau 8 Werte!", sequence);
        return;
    }

    const formattedSequence = new Float32Array(sequence);
    const event = new RNBO.MessageEvent(RNBO.TimeNow, "seq", formattedSequence);
    device.scheduleEvent(event);
    console.log("📡 Gesendete Sequenz an RNBO:", formattedSequence);
}


function setupRNBOEventListener() {
    if (!device) {
        console.error("RNBO-Device nicht geladen, keine Events abonniert.");
        return;
    }

    device.messageEvent.subscribe((ev) => {
        console.log(`📡 Empfangenes RNBO-Event: ${ev.tag}: ${ev.payload}`);
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
