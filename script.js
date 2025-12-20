let API = null;
const statusEl = document.getElementById('status');

// Fixed based on your model
const TARGET_PROPERTY_SET = "ICOS Rebar";
const TARGET_PROPERTY_NAME = "Serial number";  // Exact match from screenshot

async function initExtension() {
  try {
    API = await TrimbleConnectWorkspace.connect(window.parent);
    statusEl.textContent = "Connected to Trimble Connect 3D Viewer";
    statusEl.className = "text-success";
    console.log("API ready");
  } catch (err) {
    statusEl.textContent = "Connection failed: " + err.message;
    statusEl.className = "text-danger";
    console.error(err);
  }
}

function randomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return { r, g, b };
}

const serialColorMap = new Map();

async function colorBySerialNumber() {
  if (!API) return alert("Not connected");

  const selection = await API.viewer.getSelection();
  if (!selection || selection.length === 0) return alert("Please select rebar objects first");

  const objects = await API.viewer.getObjects({ selected: true });

  let foundAny = false;

  for (const model of objects) {
    for (const obj of model.objects) {
      const propSets = obj.properties?.propertySets || [];
      const targetSet = propSets.find(ps => ps.name === TARGET_PROPERTY_SET);
      if (!targetSet) continue;

      const snProp = targetSet.properties.find(p => p.name === TARGET_PROPERTY_NAME);
      if (!snProp?.value) continue;

      foundAny = true;
      const serial = snProp.value.toString();
      let color = serialColorMap.get(serial);
      if (!color) {
        color = randomColor();
        serialColorMap.set(serial, color);
      }

      await API.viewer.setObjectState(
        { modelObjectIds: [{ modelId: model.modelId, objectRuntimeIds: [obj.id] }] },
        { color }
      );
    }
  }

  if (!foundAny) {
    alert(`No "${TARGET_PROPERTY_NAME}" found in "${TARGET_PROPERTY_SET}". Select different objects or check properties.`);
  } else {
    alert("Successfully colored selected rebars by Serial number (same number = same color)!");
  }
}

async function addSerialNumberMarkups() {
  if (!API) return alert("Not connected");

  const selection = await API.viewer.getSelection();
  if (!selection || selection.length === 0) return alert("Please select rebar objects first");

  const objects = await API.viewer.getObjects({ selected: true });
  const textMarkups = [];

  let foundAny = false;

  for (const model of objects) {
    for (const obj of model.objects) {
      const propSets = obj.properties?.propertySets || [];
      const targetSet = propSets.find(ps => ps.name === TARGET_PROPERTY_SET);
      if (!targetSet) continue;

      const snProp = targetSet.properties.find(p => p.name === TARGET_PROPERTY_NAME);
      if (!snProp?.value) continue;

      foundAny = true;
      const center = obj.boundingBox?.center;
      if (!center) continue;

      textMarkups.push({
        text: snProp.value.toString(),
        position: { x: center.x, y: center.y + 2, z: center.z }, // raised higher for visibility
        color: { r: 255, g: 255, b: 0 }, // bright yellow
        fontSize: 40,
        backgroundColor: { r: 0, g: 0, b: 0, a: 200 } // darker background
      });
    }
  }

  if (!foundAny) {
    alert(`No "${TARGET_PROPERTY_NAME}" found in selected objects.`);
    return;
  }

  await API.markup.addTextMarkup(textMarkups);
  alert(`Added ${textMarkups.length} text markups showing the Serial number!`);
}

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

window.onload = initExtension;