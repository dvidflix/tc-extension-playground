let workspaceApi = null;  // Full WorkspaceAPI instance
let viewer = null;        // Shortcut to viewer API
const statusEl = document.getElementById('status');

const TARGET_PROPERTY_SET = "ICOS Rebar";
const TARGET_PROPERTY_NAME = "Serial number";

async function initExtension() {
  try {
    // Modern connection (for extensions loaded in side panel – uses window.parent)
    workspaceApi = await WorkspaceAPI.connect(window.parent);
    viewer = workspaceApi.viewer;  // viewer API
    statusEl.textContent = "Connected – Ready to use!";
    statusEl.className = "text-success";
    console.log("Trimble Connect Workspace API connected");
  } catch (error) {
    statusEl.textContent = "Connection failed: " + error.message;
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
  if (!viewer) return alert("Not connected");

  const selection = await viewer.getSelection();
  if (!selection?.length) return alert("Please select rebar objects first");

  // Get basic selected objects
  const basicObjects = await viewer.getObjects({ selected: true });

  let totalProcessed = 0;

  for (const model of basicObjects) {
    const runtimeIds = model.objects.map(obj => obj.id);
    if (runtimeIds.length === 0) continue;

    // Fetch full properties
    const fullObjects = await viewer.getObjectProperties({
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

      // Apply color to single object
      await viewer.setObjectState(
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
  if (!viewer) return alert("Not connected");

  const selection = await viewer.getSelection();
  if (!selection?.length) return alert("Please select rebar objects first");

  const basicObjects = await viewer.getObjects({ selected: true });

  const markups = [];
  let count = 0;

  for (const model of basicObjects) {
    const runtimeIds = model.objects.map(obj => obj.id);
    if (runtimeIds.length === 0) continue;

    const fullObjects = await viewer.getObjectProperties({
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

  // Assuming markup API is available on workspaceApi (common in viewer extensions)
  if (!workspaceApi.markup) {
    alert("Markup API not available in this context");
    return;
  }

  await workspaceApi.markup.addTextMarkup(markups);
  alert(`Added ${count} serial number markup(s)`);
}

async function resetColors() {
  if (!viewer) return alert("Not connected");

  try {
    // Reset all colors globally
    await viewer.setObjectState(undefined, { color: { reset: true } });
    serialColorMap.clear();
    alert("All colors reset successfully");
  } catch (error) {
    console.error(error);
    alert("Failed to reset colors");
  }
}

// Call init on load
initExtension();