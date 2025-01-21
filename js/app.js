async function setup() {
        console.log("Setup wird gestartet...");
        const patchExportURL = "https://stu-philtreezs-projects.vercel.app/export/patch.export.json";
    
        const WAContext = window.AudioContext || window.webkitAudioContext;
        const context = new WAContext();
        const outputNode = context.createGain();
        outputNode.connect(context.destination);
    
        let device;
        try {
            const response = await fetch(patchExportURL);
            const patcher = await response.json();
    
            if (!window.RNBO) {
                console.log("Lade RNBO-Bibliothek...");
                await loadRNBOScript(patcher.desc.meta.rnboversion);
            }
    
            device = await RNBO.createDevice({ context, patcher });
            device.node.connect(outputNode);
    
            console.log("RNBO-Device erfolgreich erstellt.");
        } catch (error) {
            console.error("Fehler beim Laden oder Erstellen des RNBO-Devices:", error);
            return;
        }
    
        document.body.addEventListener("click", () => context.resume());
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