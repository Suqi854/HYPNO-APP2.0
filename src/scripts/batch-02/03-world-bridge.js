(() => {
  "use strict";

  const core = globalThis.HypnoAppRevisedCore;
  if (!core) return;

  async function addLocation(payload) {
    const state = core.getState();
    state.locations = state.locations.filter((item) => item.name !== payload.name);
    state.locations.push({ name: payload.name, description: payload.description || "" });
    core.setState(state);
    await core.syncWorldbook();
    return core.getState();
  }

  async function deleteLocation(payload) {
    const state = core.getState();
    state.locations = state.locations.filter((item) => item.name !== payload.name);
    core.setState(state);
    await core.syncWorldbook();
    return core.getState();
  }

  async function saveRule(payload) {
    const state = core.getState();
    state.rules = state.rules.filter((item) => item.id !== payload.id);
    state.rules.push({
      id: payload.id,
      text: payload.text || "",
      type: payload.type || "永久",
      scope: payload.scope || "整个故事",
      time: payload.time || "永久"
    });
    core.setState(state);
    await core.syncWorldbook();
    return core.getState();
  }

  async function deleteRule(payload) {
    const state = core.getState();
    state.rules = state.rules.filter((item) => item.id !== payload.id);
    core.setState(state);
    await core.syncWorldbook();
    return core.getState();
  }

  async function savePlot(payload) {
    const state = core.getState();
    state.plot = payload.plot || "";
    core.setState(state);
    await core.syncWorldbook();
    return core.getState();
  }

  core.register("location:add", addLocation);
  core.register("location:delete", deleteLocation);
  core.register("rule:save", saveRule);
  core.register("rule:delete", deleteRule);
  core.register("plot:save", savePlot);
  core.register("state:get", () => core.getState());

  globalThis.HypnoAppRevisedWorldBridge = {
    addLocation,
    deleteLocation,
    saveRule,
    deleteRule,
    savePlot
  };
})();
