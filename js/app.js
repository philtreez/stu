let device;
let context; // Global deklarieren
let outputNode;

async function setup() {
    console.log("Setup wird gestartet...");
    const patchExportURL = "https://stu-philtreezs-projects.vercel.app/export/patch.export.json";

    // AudioContext NICHT sofort erstellen
    context = null;
    outputNode = null;

    try {
        const response = await fetch(patchExportURL);
        const patcher = await response.json();

        if (!window.RNBO) {
            console.log("Lade RNBO-Bibliothek...");
            await loadRNBOScript(patcher.desc.meta.rnboversion);
        }

        // RNBO-Gerät erst nach Nutzerinteraktion starten
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

        // Debugging: Alle RNBO-Inports & Outports ausgeben
        console.log("🔍 RNBO Messages:", device.messages);

        setupPlayButton();
        setupSequenceButtons();
        setupRNBOEventListener();

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
    const sequence = Array(8).fill(0); // Startet mit [0, 0, 0, 0, 0, 0, 0, 0]

    for (let i = 0; i < 8; i++) {
        const divButton = document.getElementById(`btn-${i}`);
        if (divButton) {
            divButton.style.cursor = "pointer"; // Cursor anzeigen
            divButton.innerText = "0"; // Setzt den Anfangswert auf "0"

            divButton.addEventListener("click", () => {
                sequence[i] = sequence[i] === 0 ? 1 : 0;
                divButton.innerText = sequence[i]; // Aktualisiert den Text auf "0" oder "1"
                console.log(`Button ${i} geklickt! Neuer Wert: ${sequence[i]}`);
            });
        } else {
            console.warn(`DIV-Button btn-${i} nicht gefunden`);
        }
    }

    // Unsichtbaren "Send Sequence"-Button erzeugen
    const sendButton = document.createElement("button");
    sendButton.id = "send-seq";
    sendButton.style.display = "none"; // Unsichtbar
    document.body.appendChild(sendButton);

    // Eventlistener für den Send-Button
    sendButton.addEventListener("click", () => {
        if (!window.device) {
            console.error("RNBO-Device nicht geladen.");
            return;
        }

        // WICHTIG: Float32Array oder map(Number) für RNBO-Kompatibilität
        const formattedSequence = sequence.map(Number);
        const event = new RNBO.MessageEvent(RNBO.TimeNow, "seq", formattedSequence);
        device.scheduleEvent(event);
        console.log("📡 Gesendete Sequenz an RNBO:", formattedSequence);
    });

    // Optional: Automatisch senden nach 2 Sekunden (zum Testen)
    setTimeout(() => {
        document.getElementById("send-seq").click();
    }, 2000);
}

// Funktion, um alle RNBO-Ausgaben zu loggen
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

// Starte die App
setup();
