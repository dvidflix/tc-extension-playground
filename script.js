let API = null;
const statusEl = document.getElementById('status');

async function initExtension() {
  try {
    // In extension mode: connect to the parent window (the 3D Viewer)
    API = await TrimbleConnectWorkspace.connect(window.parent);

    statusEl.textContent = "Connected to Trimble Connect 3D Viewer";
    statusEl.className = "text-success";
    console.log("API ready:", API);
  } catch (err) {
    statusEl.textContent = "Connection failed: " + err.message;
    statusEl.className = "text-danger";
    console.error(err);
  }
}

// Helper: random color
function randomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return { r, g, b };
}

const serialColorMap = new Map();

/* Function 1: Color by Serial number */
async function colorBySerialNumber() {
  if (!API) return alert("Not connected to viewer");

  const selection = await API.viewer.getSelection();
  if (!selection || selection.length === 0) {
    return alert("Please select some rebar objects first");
  }

  const objects = await API.viewer.getObjects({ selected: true });

  for (const model of objects) {
    for (const obj of model.objects) {
      const propertySets = obj.properties?.propertySets || [];
      const rebarSet = propertySets.find(ps => ps.name === "ICOS Rebar");
      const snProp = rebarSet?.properties?.find(p => p.name === "Serial number");

      if (!snProp?.value) continue;

      const serialNumber = snProp.value;
      let color = serialColorMap.get(serialNumber);
      if (!color) {
        color = randomColor();
        serialColorMap.set(serialNumber, color);
      }

      await API.viewer.setObjectState(
        {
          modelObjectIds: [{
            modelId: model.modelId,
            objectRuntimeIds: [obj.id]
          }]
        },
        { color }
      );
    }
  }

  alert("Colored selected rebars by Serial number");
}

/* Function 2: Add Text Markups */
async function addSerialNumberMarkups() {
  if (!API) return alert("Not connected to viewer");

  const selection = await API.viewer.getSelection();
  if (!selection || selection.length === 0) {
    return alert("Please select some rebar objects first");
  }

  const objects = await API.viewer.getObjects({ selected: true });
  const textMarkups = [];

  for (const model of objects) {
    for (const obj of model.objects) {
      const propertySets = obj.properties?.propertySets || [];
      const rebarSet = propertySets.find(ps => ps.name === "ICOS Rebar");
      const snProp = rebarSet?.properties?.find(p => p.name === "Serial number");

      if (!snProp?.value) continue;

      const center = obj.boundingBox?.center;
      if (!center) continue;

      textMarkups.push({
        text: snProp.value.toString(),
        position: { x: center.x, y: center.y + 1, z: center.z }, // offset slightly up
        color: { r: 255, g: 255, b: 0 }, // yellow
        fontSize: 30,
        backgroundColor: { r: 0, g: 0, b: 0, a: 150 }
      });
    }
  }

  if (textMarkups.length === 0) {
    return alert("No Serial number found in selected objects");
  }

  await API.markup.addTextMarkup(textMarkups);
  alert(`Added ${textMarkups.length} text markups`);
}

/* Helpers */
async function resetColors() {
  if (!API) return;
  await API.viewer.setObjectState(undefined, { color: "reset" });
  serialColorMap.clear();
  alert("Colors reset");
}

async function removeMarkups() {
  if (!API) return;
  await API.markup.removeMarkups();
  alert("All markups removed");
}

// Start connection when page loads
window.onload = initExtension;