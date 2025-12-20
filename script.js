let API = null;
const statusEl = document.getElementById('status');

// Exact names from your model
const TARGET_PROPERTY_SET = "ICOS Rebar";
const TARGET_PROPERTY_NAME = "Serial number";

async function initExtension() {
  try {
    // Critical: connect to window.parent (the actual 3D viewer)
    API = await TrimbleConnectWorkspace.connect(window.parent);

    statusEl.textContent = "Connected – Ready to use!";
    statusEl.className = "text-success";
    console.log("Trimble Connect API connected successfully");
  } catch (error) {
    statusEl.textContent = "Connection failed";
    statusEl.className = "text-danger";
    console.error("Connection error:", error);
  }
}

function randomColor() {
  return {
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256)
  };
}

const serialColorMap = new Map();

async function colorBySerialNumber() {
  if (!API) return alert("Not connected to viewer");

  const selection = await API.viewer.getSelection();
  if (!selection?.length) return alert("Please select rebar objects first");

  const objects = await API.viewer.getObjects({ selected: true });

  let processedCount = 0;

  for (const model of objects) {
    for (const obj of model.objects) {
      const propSets = obj.properties?.propertySets || [];
      const rebarSet = propSets.find(ps => ps.name === TARGET_PROPERTY_SET);
      if (!rebarSet) continue;

      const serialProp = rebarSet.properties.find(p => p.name === TARGET_PROPERTY_NAME);
      if (!serialProp?.value) continue;

      const serial = serialProp.value.toString();
      let color = serialColorMap.get(serial);
      if (!color) {
        color = randomColor();
        serialColorMap.set(serial, color);
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

      processedCount++;
    }
  }

  if (processedCount === 0) {
    alert("No objects with 'Serial number' in 'ICOS Rebar' found in selection");
  } else {
    alert(`Colored ${processedCount} rebar object(s) by Serial number`);
  }
}

async function addSerialNumberMarkups() {
  if (!API) return alert("Not connected to viewer");

  const selection = await API.viewer.getSelection();
  if (!selection?.length) return alert("Please select rebar objects first");

  const objects = await API.viewer.getObjects({ selected: true });
  const markups = [];
  let count = 0;

  for (const model of objects) {
    for (const obj of model.objects) {
      const propSets = obj.properties?.propertySets || [];
      const rebarSet = propSets.find(ps => ps.name === TARGET_PROPERTY_SET);
      if (!rebarSet) continue;

      const serialProp = rebarSet.properties.find(p => p.name === TARGET_PROPERTY_NAME);
      if (!serialProp?.value) continue;

      const center = obj.boundingBox?.center;
      if (!center) continue;

      markups.push({
        text: serialProp.value.toString(),
        position: { x: center.x, y: center.y + 2, z: center.z },
        color: { r: 255, g: 255, b: 0 },         // yellow text
        fontSize: 40,
        backgroundColor: { r: 0, g: 0, b: 0, a: 200 }
      });

      count++;
    }
  }

  if (count === 0) {
    alert("No 'Serial number' found in selected objects");
    return;
  }

  await API.markup.addTextMarkup(markups);
  alert(`Added ${count} serial number label(s)`);
}

async function resetColors() {
  if (!API) return;
  await API.viewer.setObjectState(undefined, { color: "reset" });
  serialColorMap.clear();
  alert("All colors reset");
}

async function removeMarkups() {
  if (!API) return;
  await API.markup.removeMarkups();
  alert("All markups removed");
}

// Start connection on load
window.onload = initExtension;