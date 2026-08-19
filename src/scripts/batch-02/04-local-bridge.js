(() => {
  "use strict";

  const core = globalThis.HypnoAppRevisedCore;
  if (!core) return;

  core.register("icon:set", (payload) => {
    const state = core.getState();
    state.icon = payload.icon || "pulse";
    core.setState(state);
    return core.getState();
  });

  core.register("crack:set", (payload) => {
    const state = core.getState();
    state.crack = { mc: false, money: false, vip: false, ...(payload || {}) };
    core.setState(state);
    return core.getState();
  });
})();
