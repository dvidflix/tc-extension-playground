let API;
const viewerFrame = document.getElementById('viewerFrame');

async function initViewer() {
  // Replace with your own tokens / project if needed
  const url = `${window.location.origin}?isEmbedded=true`;

  viewerFrame.src = url;
  viewerFrame.onload = async () => {
    API = await TrimbleConnectWorkspace.connect(viewerFrame.contentWindow);

    // Optional: set tokens if running outside of Connect
    // await API.embed.setTokens({ accessToken: "...", shareToken: "..." });
    // await API.embed.init3DViewer({ projectId: "your-project-id" });

    console.log("Trimble Connect API ready");
  };
}

// Helper: generate random color
function randomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return { r, g, b };
}

// Map to cache color per Serial number
const serialColorMap = new Map();

/* ============== FUNCTION 1: Color by Serial number ============== */
async function colorBySerialNumber() {
  if (!API) return alert("Viewer not ready");

  const selection = await API.viewer.getSelection();
  if (!selection || selection.length === 0) {
    alert("Please select some rebar objects first");
    return;
  }

  const objects = await API.viewer.getObjects({ selected: true });

  for (const model of objects) {
    for (const obj of model.objects) {
      // Get properties of this object
      const props = obj.properties || {};
      const propertySets = props.propertySets || [];

      let serialNumber = null;
      const rebarSet = propertySets.find(ps => ps.name === "ICOS Rebar");
      if (rebarSet) {
        const snProp = rebarSet.properties.find(p => p.name === "Serial number");
        if (snProp) serialNumber = snProp.value;
      }

      if (!serialNumber) continue; // skip if no Serial number

      // Get or create random color for this Serial number
      let color = serialColorMap.get(serialNumber);
      if (!color) {
        color = randomColor();
        serialColorMap.set(serialNumber, color);
      }

      // Apply color to this single object
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

  alert("Selected rebars colored by Serial number");
}

/* ============== FUNCTION 2: Add Text Markups with Serial number ============== */
async function addSerialNumberMarkups() {
  if (!API) return alert("Viewer not ready");

  const selection = await API.viewer.getSelection();
  if (!selection || selection.length === 0) {
    alert("Please select some rebar objects first");
    return;
  }

  const objects = await API.viewer.getObjects({ selected: true });

  const textMarkups = [];

  for (const model of objects) {
    for (const obj of model.objects) {
      const props = obj.properties || {};
      const propertySets = props.propertySets || [];

      let serialNumber = null;
      const rebarSet = propertySets.find(ps => ps.name === "ICOS Rebar");
      if (rebarSet) {
        const snProp = rebarSet.properties.find(p => p.name === "Serial number");
        if (snProp) serialNumber = snProp.value;
      }

      if (!serialNumber) continue;

      // Use the object's bounding box center as markup position
      const center = obj.boundingBox?.center;
      if (!center) continue;

      textMarkups.push({
        text: serialNumber.toString(),
        position: { x: center.x, y: center.y + 1, z: center.z }, // slightly above
        color: { r: 255, g: 255, b: 0 }, // yellow text
        fontSize: 30,
        backgroundColor: { r: 0, g: 0, b: 0, a: 150 } // semi-transparent black background
      });
    }
  }

  if (textMarkups.length === 0) {
    alert("No Serial number found in selected objects");
    return;
  }

  await API.markup.addTextMarkup(textMarkups);
  alert(`Added ${textMarkups.length} text markups with Serial numbers`);
}

/* ============== Helper functions ============== */
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

// Start the viewer when page loads
window.onload = initViewer;