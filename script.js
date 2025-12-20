let API = null;
const statusEl = document.getElementById('status');

// === CUSTOMIZE THESE TWO VALUES BASED ON YOUR MODEL ===
let TARGET_PROPERTY_SET = "ICOS Rebar";     // Change this to the exact property set name
let TARGET_PROPERTY_NAME = "Serial number";  // Change this to the exact property name
// =====================================================

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
  if (!selection || selection.length === 0) return alert("Please select rebar objects");

  const objects = await API.viewer.getObjects({ selected: true });

  let foundAny = false;

  for (const model of objects) {
    console.log(`Model ID: ${model.modelId}`);
    for (const obj of model.objects) {
      const propSets = obj.properties?.propertySets || [];
      console.log("Available property sets:", propSets.map(ps => ps.name));

      const targetSet = propSets.find(ps => ps.name === TARGET_PROPERTY_SET);
      if (!targetSet) continue;

      console.log(`Found set "${TARGET_PROPERTY_SET}" properties:`, targetSet.properties.map(p => p.name));

      const snProp = targetSet.properties.find(p => p.name === TARGET_PROPERTY_NAME);
      if (!snProp?.value) continue;

      foundAny = true;
      const serial = snProp.value;
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

  if (!foundAny) alert(`No "${TARGET_PROPERTY_NAME}" found in property set "${TARGET_PROPERTY_SET}". Check console (F12) for available names.`);
  else alert("Colored by Serial number successfully!");
}

async function addSerialNumberMarkups() {
  if (!API) return alert("Not connected");

  const selection = await API.viewer.getSelection();
  if (!selection || selection.length === 0) return alert("Please select rebar objects");

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
        position: { x: center.x, y: center.y + 1.5, z: center.z }, // raised a bit higher
        color: { r: 255, g: 255, b: 0 },
        fontSize: 36,
        backgroundColor: { r: 0, g: 0, b: 0, a: 180 }
      });
    }
  }

  if (!foundAny) {
    alert(`No "${TARGET_PROPERTY_NAME}" found in property set "${TARGET_PROPERTY_SET}". Check console (F12) for available names.`);
    return;
  }

  await API.markup.addTextMarkup(textMarkups);
  alert(`Added ${textMarkups.length} text markups`);
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