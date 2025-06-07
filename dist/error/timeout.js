"use strict";
(() => {
  // src/error/timeout.ts
  var TimeoutError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "TimeoutError";
    }
  };
})();
//# sourceMappingURL=timeout.js.map
