"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/background.js
  function debugPrint(text) {
    console.log("-".repeat(20));
    console.log(text);
    console.log("-".repeat(20));
  }
  var Browser = class {
    static get browser_instance() {
      if (typeof browser !== "undefined") {
        return browser;
      }
      if (typeof chrome !== "undefined") {
        return chrome;
      }
      throw new Error("No browser instance found");
    }
  };
  var Storage = class {
    static async createIfNotExists(key, init_value) {
      return new Promise((resolve, _reject) => {
        this.storage.get(key).then((result) => {
          if (result[key] === void 0) {
            this.storage.set({ [key]: init_value }, () => {
            });
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
    }
    static async get(key) {
      return new Promise((resolve, _reject) => {
        this.storage.get(key).then((result) => {
          resolve(result);
        });
      });
    }
    static async set(key, value) {
      return new Promise((resolve, _reject) => {
        this.storage.set({ [key]: value }, () => {
          resolve();
        });
      });
    }
    static async delete(key) {
      return new Promise((resolve, _reject) => {
        this.storage.remove(key, () => {
          resolve();
        });
      });
    }
  };
  __publicField(Storage, "storage", Browser.browser_instance.storage.sync);
  function cleanRoutine() {
    Storage.get("channels").then((result) => {
      if (result.channels === void 0) return;
      let channels = result.channels;
      channels = channels.filter((c) => c !== null);
      console.log(channels);
      Storage.set("channels", channels);
    });
  }
  Storage.createIfNotExists("channels", []);
  Storage.createIfNotExists("enabled", true);
  async function getChannels() {
    const result = await Storage.get("channels");
    return result;
  }
  async function getTab(tabIndex) {
    let queryOptions = { active: true, currentWindow: true, index: tabIndex };
    let tabs = await Browser.browser_instance.tabs.query(queryOptions);
    let MAX_ATTEMPTS = 100;
    while (tabs.length === 0 && MAX_ATTEMPTS > 0) {
      tabs = await Browser.browser_instance.tabs.query(queryOptions);
      await new Promise((resolve) => setTimeout(resolve, 50));
      MAX_ATTEMPTS--;
    }
    if (MAX_ATTEMPTS === 0) {
      console.log("Error: Could not get tab...");
      return null;
    }
    return tabs[0].url;
  }
  function determinePageType(url) {
    const urlObject = new URL(url);
    if (urlObject.hostname === "www.youtube.com") {
      const path = urlObject.pathname.toLowerCase();
      if (path === "/" || path === "/results" || path === "/feed/trending") {
        return "home";
      } else if (path.startsWith("/watch")) {
        return "video";
      } else if (path.startsWith("/@")) {
        return "channel";
      }
    }
    return "home";
  }
  Browser.browser_instance.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
      Browser.browser_instance.tabs.sendMessage(tab.id, { type: "update" });
    }
  });
  Browser.browser_instance.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    if (request.type === "set-channels") {
      Storage.set("channels", request.channels);
      _sendResponse({ type: "reload-channels", channels: request.channels });
      Browser.browser_instance.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          Browser.browser_instance.tabs.sendMessage(tab.id, { type: "update-channels", channels: request.channels });
        });
      });
    }
  });
  Browser.browser_instance.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    if (request.type === "add-channel") {
      Storage.get("channels").then((result) => {
        var _a, _b;
        let channels = result.channels;
        if (channels.includes(request.channel)) {
          return;
        } else {
          if (((_b = (_a = request.channel) == null ? void 0 : _a.length) != null ? _b : 0) <= 0) return;
          debugPrint("Adding Channel: " + request.channel);
          channels.push(request.channel);
          Storage.set("channels", channels);
        }
      });
    }
  });
  Browser.browser_instance.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    if (request.type === "remove-channel") {
      Storage.get("channels").then((result) => {
        let channels = result.channels;
        if (channels.includes(request.channel)) {
          debugPrint("Remove Channel: " + request.channel);
          channels = channels.filter((c) => c !== request.channel);
          Storage.set("channels", channels);
        } else {
        }
      });
    }
  });
  Browser.browser_instance.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    if (request.type === "get-channels") {
      getChannels().then((result) => {
        console.log("Sending channels: ", result.channels);
        _sendResponse({ type: "query-channels", channels: result.channels });
      });
      return true;
    }
  });
  Browser.browser_instance.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    if (request.type === "get-page") {
      const tabIndex = _sender.tab.index;
      getTab(tabIndex).then((result) => {
        const page = determinePageType(result);
        _sendResponse({ type: "query-page", page });
      });
      return true;
    }
  });
  Browser.browser_instance.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    if (request.type === "get-enabled") {
      Storage.get("enabled").then((result) => {
        _sendResponse({ type: "query-enabled", enabled: result.enabled });
        console.log("Sending enabled: ", result.enabled);
      });
      return true;
    }
  });
  Browser.browser_instance.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    var _a;
    if (request.type === "set-enabled") {
      Storage.set("enabled", (_a = request.enabled) != null ? _a : true);
      console.log("Setting enabled to: ", request.enabled);
      return true;
    }
  });
  cleanRoutine();
})();
//# sourceMappingURL=background.js.map
