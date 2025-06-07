"use strict";
(() => {
  // src/util/sleep.ts
  async function sleep(callback, timeout) {
    return new Promise((resolve, _reject) => {
      setTimeout(() => {
        resolve(callback());
      }, timeout);
    });
  }
})();
//# sourceMappingURL=sleep.js.map
