let API = null;
const statusEl = document.getElementById('status');

const TARGET_PROPERTY_SET = "ICOS Rebar";
const TARGET_PROPERTY_NAME = "Serial number";

async function initExtension() {
  try {
    API = await TrimbleConnectWorkspace.connect(window.parent);
    statusEl.textContent = "Connected – Ready to use!";
    statusEl.className = "text-success";
    console.log("Trimble Connect API connected");
  } catch (error) {
    statusEl.textContent = "Connection failed";
    statusEl.className = "text-danger";
    console.error(error);
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
  if (!API) return alert("Not connected");

  const selection = await API.viewer.getSelection();
  if (!selection?.length) return alert("Please select rebar objects first");

  // Step 1: Get basic selected objects (to extract modelId + runtimeIds)
  const basicObjects = await API.viewer.getObjects({ selected: true });

  let totalProcessed = 0;

  for (const model of basicObjects) {
    const runtimeIds = model.objects.map(obj => obj.id);
    if (runtimeIds.length === 0) continue;

    // Step 2: Fetch full properties for these objects
    const fullObjects = await API.viewer.getObjectProperties({
      modelId: model.modelId,
      objectRuntimeIds: runtimeIds
    });

    for (const obj of fullObjects) {
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

      totalProcessed++;
    }
  }

  if (totalProcessed === 0) {
    alert("No 'Serial number' found in selected objects (check if rebars are selected and have ICOS Rebar properties)");
  } else {
    alert(`Colored ${totalProcessed} rebar(s) by Serial number`);
  }
}

async function addSerialNumberMarkups() {
  if (!API) return alert("Not connected");

  const selection = await API.viewer.getSelection();
  if (!selection?.length) return alert("Please select rebar objects first");

  const basicObjects = await API.viewer.getObjects({ selected: true });

  const markups = [];
  let count = 0;

  for (const model of basicObjects) {
    const runtimeIds = model.objects.map(obj => obj.id);
    if (runtimeIds.length === 0) continue;

    const fullObjects = await API.viewer.getObjectProperties({
      modelId: model.modelId,
      objectRuntimeIds: runtimeIds
    });

    for (const obj of fullObjects) {
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
        color: { r: 255, g: 255, b: 0 },
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
  alert(`Added ${count} serial number markup(s)`);
}

async function resetColors() {
  if (!API) return;
  await API.viewer.setObjectState(undefined, { color: "