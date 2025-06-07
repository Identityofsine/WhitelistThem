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

  // src/handler/messagehandler.ts
  var MessageHandler = class {
    static send(message, callback) {
      Browser.browser.runtime.sendMessage(message, (response) => {
        var lastError = Browser.browser.runtime.lastError;
        if (lastError) {
          console.error("[MessageHandler] Error: %s", lastError.message);
          return;
        }
        if (callback)
          callback(response);
      });
    }
    static addChannel(channel) {
      this.send({ type: "add-channel", channel });
    }
    static removeChannel(channel) {
      this.send({ type: "remove-channel", channel });
    }
    static onMessage(callback) {
      Browser.browser.runtime.onMessage.addListener(() => callback());
    }
  };
})();
//# sourceMappingURL=messagehandler.js.map
