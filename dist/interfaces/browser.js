"use strict";
(() => {
  // src/interfaces/browser.ts
  var Browser = class {
    static get isFirefox() {
      return navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
    }
    static get browser() {
      if (chrome) {
        return chrome;
      } else {
        return browser;
      }
    }
  };
})();
//# sourceMappingURL=browser.js.map
