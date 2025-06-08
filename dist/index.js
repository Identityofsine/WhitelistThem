"use strict";
(() => {
  // src/constants/settings.ts
  var SleepSettings = {
    waiting: 250,
    engine: 600,
    max_attempts: 50
  };
  var YoutubeSettings = {
    home: {
      container: "ytd-rich-grid-renderer",
      yt_video: "ytd-rich-item-renderer",
      yt_video_title: {
        tag: "a",
        id: "video-title-link"
      },
      shorts: {
        tag: "ytd-rich-section-renderer",
        class: "style-scope ytd-rich-grid-renderer"
      }
    },
    video: {
      container: "ytd-watch-next-secondary-results-renderer",
      yt_video: "ytd-compact-video-renderer",
      yt_circle: "ytd-continuation-item-renderer",
      yt_video_link: {
        tag: "a",
        class: "yt-simple-endpoint style-scope ytd-compact-video-renderer"
      },
      yt_video_title: {
        tag: "span",
        id: "video-title"
      },
      channel: {
        container: "ytd-channel-name",
        tag: "yt-formatted-string",
        id: "channel-name",
        link: {
          container: "dismissible",
          tag: "a",
          class: "yt-simple-endpoint style-scope ytd-compact-video-renderer"
        }
      }
    },
    channel: {
      channel: {
        container: "ytd-channel-name",
        tag: "yt-formatted-string"
      },
      inject: {
        container: {
          tag: "div",
          id: "inner-header-container"
        },
        injection_spot: {
          tag: "div",
          id: "buttons",
          inject_id: "wt-add"
        }
      }
    },
    generic: {
      header: {
        container: {
          tag: "ytd-masthead",
          id: "masthead"
        },
        buttons: {
          tag: "div",
          id: "end",
          inject: {
            id: "buttons"
          }
        }
      },
      yt_video: {
        channel: {
          tag: "ytd-channel-name",
          id: { tag: "a" }
        },
        title: {
          tag: "a",
          id: "video-title-link"
        }
      }
    }
  };

  // src/object/abstract/identifiable.ts
  var Identifiable = class _Identifiable {
    constructor(id, name) {
      this.uuid = "";
      this.id = "";
      this.name = "";
      this.uuid = _Identifiable.generateUUID();
      this.id = id;
      this.name = name;
    }
    static generateUUID() {
      const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function(c) {
          return (c === "x" ? Math.random() * 16 | 0 : (Math.random() * 16 | 0) & 3 | 8).toString(16);
        }
      );
      return uuid;
    }
    static generateIdentifiable(name) {
      const id = _Identifiable.generateUUID();
      return new _Identifiable(id, name);
    }
    compare(other) {
      return this.id === other.id;
    }
    compareUUID(other) {
      return this.uuid === other.uuid;
    }
  };

  // src/object/video.ts
  var Video = class extends Identifiable {
    constructor(id, name, isShort, dom) {
      super(id, name);
      this.isShort = false;
      this.dom = null;
      this.disabled = false;
      this.injected = false;
      this.isShort = isShort;
      this.dom = dom;
    }
    changeInjectionState(plus) {
    }
    refresh() {
    }
    disable() {
      if (this.disabled) return;
      if (!this.dom) return;
      if (ChromeExtension.enabled) {
        this.dom.style.display = "none";
      }
      this.changeInjectionState(true);
      this.disabled = true;
    }
    enable() {
      if (!this.dom) return;
      if (ChromeExtension.enabled) {
        this.dom.style.display = "block";
      }
      this.changeInjectionState(false);
      this.disabled = false;
    }
    /**
     * @param {Channel} channel
     */
    inject(channel) {
      if (!this.dom) return;
      if (this.dom.dataset.whitelisted) {
        this.injected = true;
        return;
      }
    }
  };

  // src/factory/videofactory.ts
  var VideoFactory = class {
    static createVideo(video_dom) {
      var _a;
      function extractVideoId(url) {
        var match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        return match && match[1];
      }
      function getTitleAndID() {
        const is_home = ChromeExtension.page_instance.page === "home";
        let anchor_tags;
        if (is_home) {
          anchor_tags = video_dom.getElementsByTagName(YoutubeSettings.home.yt_video_title.tag);
        } else {
          anchor_tags = video_dom.getElementsByTagName(YoutubeSettings.video.yt_video_title.tag);
        }
        for (let i = 0; i < anchor_tags.length; i++) {
          const anchor = anchor_tags[i];
          if (is_home) {
            if (anchor.id === YoutubeSettings.home.yt_video_title.id) {
              return { title: anchor.innerText, id: extractVideoId(anchor.href) };
            }
          } else {
            if (anchor.id === YoutubeSettings.video.yt_video_title.id) {
              const href_dom = video_dom.getElementsByTagName(YoutubeSettings.video.yt_video_link.tag)[0];
              const href = href_dom.href;
              return { title: anchor.innerText, id: extractVideoId(href) };
            }
          }
        }
        return { title: "", id: "" };
      }
      function getChannelName() {
        const is_home = ChromeExtension.page_instance.page === "home";
        let channel_tag;
        if (is_home) {
          channel_tag = video_dom.getElementsByTagName(YoutubeSettings.generic.yt_video.channel.tag);
        } else {
          channel_tag = video_dom.getElementsByTagName(YoutubeSettings.video.channel.tag);
        }
        for (let i = 0; i < channel_tag.length; i++) {
          let search = null;
          if (is_home)
            search = channel_tag[i].getElementsByTagName(YoutubeSettings.generic.yt_video.channel.id.tag)[0];
          else {
            const link_container = video_dom.querySelector("#" + YoutubeSettings.video.channel.link.container);
            if (!link_container) {
              console.error("[channel] No link container");
              return { name: "", id: "" };
            }
            let link_anchor = link_container.getElementsByTagName(YoutubeSettings.video.channel.link.tag);
            let link = "";
            for (let i2 = 0; i2 < link_anchor.length; i2++) {
              const link_dom = link_anchor[i2];
              if (link_dom.className === YoutubeSettings.video.channel.link.class) {
                link = link_dom.href;
                break;
              }
            }
            search = { innerText: channel_tag[i].title, href: link };
          }
          if (search) {
            return { name: search.innerText, id: search.href };
          }
        }
        return { name: "", id: "" };
      }
      return { video: new Video((_a = getTitleAndID().id) != null ? _a : "", getTitleAndID().title, false, video_dom), channelname: getChannelName() };
    }
  };

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
        const lastError = Browser.browser.runtime.lastError;
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

  // src/error/timeout.ts
  var TimeoutError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "TimeoutError";
    }
  };

  // src/util/sleep.ts
  async function sleep(callback, timeout) {
    return new Promise((resolve, _reject) => {
      setTimeout(() => {
        resolve(callback());
      }, timeout);
    });
  }

  // src/handler/pagehandler.ts
  var _PageHandler = class _PageHandler {
    constructor() {
      this.init = false;
      this.page_loaded = false;
      this.page = "home";
      this.engine_instance = [];
      this._onVideoRefresh = [];
      this._onPageLoad = [];
    }
    async start() {
      this.getPage().then((page) => {
        this.page = page;
        console.log("Page: ", this.page);
        this.pageLoaded();
      });
    }
    static craft_engine_instance(instance, page) {
      return {
        engine: instance,
        page
      };
    }
    isPageLoading() {
      return !this.page_loaded;
    }
    isVideoOnPage() {
      let video;
      if (this.page === "home")
        video = document.getElementsByTagName(YoutubeSettings.home.yt_video);
      else
        video = document.getElementsByTagName(YoutubeSettings.video.yt_video);
      return video.length > 0;
    }
    refreshPage(callback = (_page, _update) => {
    }) {
      this.getPage().then((page) => {
        let update = false;
        if (this.page !== page) {
          update = true;
          _PageHandler.engine_running = false;
          this.page_loaded = false;
          this.page = page;
          this.pageLoaded();
        }
        callback(page, update);
      });
    }
    static async WaitForElement(div_function, indefinite = false) {
      let div = div_function();
      let attempts = 0;
      while (!div) {
        if (attempts >= SleepSettings.max_attempts && !indefinite) {
          break;
        }
        await sleep(() => {
          attempts++;
        }, SleepSettings.waiting);
        div = div_function();
      }
      if (attempts >= SleepSettings.max_attempts) {
        console.error("[WT] Can't find element, I'm giving up...");
        throw new TimeoutError("Can't find element");
      } else
        return div;
    }
    async WaitUntilHeaderLoaded(callback = () => {
    }) {
      try {
        let header_container = await _PageHandler.WaitForElement(() => document.getElementsByTagName(YoutubeSettings.generic.header.container.tag)[0]);
        await _PageHandler.WaitForElement(() => header_container.querySelector("#" + YoutubeSettings.generic.header.buttons.id));
        callback();
      } catch (e) {
        console.error("[inject::header], %s", e.message);
        return;
      }
    }
    async engine() {
      const loop_id = Identifiable.generateUUID();
      const page = this.page;
      if (_PageHandler.engine_running) {
        console.log("[%s] Engine already running (%s)", page, loop_id);
        return;
      } else {
        console.log("[%s] Engine not running (%s)", page, loop_id);
      }
      _PageHandler.engine_running = true;
      this.engine_instance.push(_PageHandler.craft_engine_instance(loop_id, page));
      console.log("[%s] Engine started (%s)", page, loop_id);
      while (this.page_loaded) {
        if (this.page != page) break;
        let another_instance = false;
        this.engine_instance.forEach((instance) => {
          if (instance.engine != loop_id && instance.page == page) another_instance = true;
        });
        if (another_instance) break;
        this._onVideoRefresh.forEach(async (callback) => {
          if (this.page != page) return;
          callback();
        });
        await sleep(() => {
        }, SleepSettings.engine);
      }
      this.engine_instance = this.engine_instance.filter((instance) => instance.engine != loop_id);
      console.log("[%s]Engine stopped (%s)", page, loop_id);
    }
    async pageLoaded() {
      if (ChromeExtension.currentPage == "channel") {
        await _PageHandler.WaitForElement(() => document.querySelector(YoutubeSettings.channel.channel.tag), true);
      } else {
        await _PageHandler.WaitForElement(() => this.isVideoOnPage(), true);
      }
      this.page_loaded = true;
      this._onPageLoad.forEach((callback) => {
        callback();
      });
      this.engine.bind(this)();
    }
    async getPage() {
      return new Promise((resolve, _reject) => {
        Browser.browser.runtime.sendMessage({ type: "get-page" }, (response) => {
          resolve(response.page);
        });
      });
    }
    /**
     * @param {Function} callback The callback to be called when a video is refreshed
     */
    set onVideoRefresh(callback) {
      this._onVideoRefresh.push(callback);
    }
    /**
     * @param {Function} callback The callback to be called when the page is loaded
     */
    set onPageLoad(callback) {
      this._onPageLoad.push(callback);
    }
  };
  _PageHandler.engine_running = false;
  var PageHandler = _PageHandler;

  // src/object/channel.ts
  var Channel = class extends Identifiable {
    constructor(id, name) {
      super(id, name);
      this.videos = [];
    }
    doesVideoExist(video) {
      if (video instanceof Video) {
        const first_search = this.videos.find((v) => v.compare(video));
        if (first_search) return first_search;
      }
      return false;
    }
    addVideo(video) {
      if (video instanceof Video) {
        const _video = this.doesVideoExist(video);
        if (_video) {
          this.removeVideo(_video);
        }
        video.inject(this);
        this.videos.push(video);
        return video;
      } else return false;
    }
    //remove video?
    removeVideo(video) {
      if (video instanceof Video) {
        this.videos = this.videos.filter((v) => !v.compare(video));
      }
    }
    enable() {
      this.videos.forEach((video) => video.enable());
    }
    disable() {
      this.videos.forEach((video) => video.disable());
    }
    refresh() {
      this.videos.forEach((video) => video.refresh());
    }
  };

  // src/framework/state/state.ts
  var State = class {
    constructor(state) {
      this._events = /* @__PURE__ */ new Map();
      this.state = state;
    }
    stateValue() {
      return this.state;
    }
    setState(newState) {
      this.state = newState;
      this._events.forEach((callback) => callback(newState));
    }
    deleteEvent(id) {
      if (this._events.has(id)) {
        this._events.delete(id);
      } else {
        console.warn(`Event with id ${id} does not exist.`);
      }
    }
    effect(effect) {
      const id = Identifiable.generateIdentifiable(`effect_func.${this._events.size}`);
      this._events.set(id, (newState) => {
        if (newState !== void 0) {
          effect(newState);
        }
      });
      return () => {
        this._events.delete(id);
      };
    }
  };
  function createState(initialState) {
    const statePrototype = new State(initialState);
    const fxState = () => statePrototype.stateValue.bind(statePrototype)();
    fxState.set = (newState) => {
      statePrototype.setState.bind(statePrototype)(newState);
    };
    fxState.effect = (effect) => {
      const cleanup = () => console.warn("No cleanup function provided");
      return () => {
        cleanup();
      };
    };
    return fxState;
  }

  // src/index.ts
  var ChannelCache = class {
    //Channel
    constructor() {
      this.channels = [];
    }
    doesChannelExist(channel) {
      if (channel instanceof Channel) {
        return this.channels.find((c) => c.compare(channel));
      }
      return false;
    }
    //methods
    addChannel(channel) {
      if (channel instanceof Channel) {
        const _channel = this.doesChannelExist(channel);
        if (!this.doesChannelExist(channel)) {
          this.channels.push(channel);
          return channel;
        } else {
          return _channel;
        }
      }
    }
    disableVideos() {
      this.channels.forEach((channel) => {
        channel.disable();
      });
    }
    enableVideos() {
      this.channels.forEach((channel) => {
        channel.enable();
      });
    }
    clearCache() {
      this.channels = [];
    }
  };
  var _ChromeExtension = class _ChromeExtension {
    constructor(allowed_channels) {
      this.channels = new ChannelCache();
      this.searching = false;
      this.started = false;
      _ChromeExtension.allowed_channels = allowed_channels;
      _ChromeExtension.page_instance.start();
      this.start();
    }
    static get currentPage() {
      return _ChromeExtension.page_instance.page;
    }
    //methods
    static async getEnabled() {
      return new Promise((resolve, _) => {
        MessageHandler.send({ type: "get-enabled" }, (response) => {
          resolve(response.enabled);
        });
      });
    }
    static setEnabled(enabled) {
      MessageHandler.send({ type: "set-enabled", enabled });
    }
    async start() {
      MessageHandler.send({ type: "get-channels" }, (response) => {
        if (response.type === "query-channels") {
          _ChromeExtension.allowed_channels = response.channels;
        }
      });
    }
    static async generateTogglePage() {
    }
    static async generateSerializerDiv() {
    }
    static async generateToggleDiv() {
      _ChromeExtension.enabled.set(await _ChromeExtension.getEnabled());
    }
    static async generateAddDiv(channel) {
    }
    async injectHeader() {
      const header = document.getElementsByTagName(YoutubeSettings.generic.header.container.tag)[0];
      if (!header) return;
      const buttons_container = header.querySelector("#" + YoutubeSettings.generic.header.buttons.id);
      const injection_spot = header.querySelector("#" + YoutubeSettings.generic.header.buttons.inject.id);
      if (!buttons_container || !injection_spot) return;
      const injection_check = injection_spot.querySelector("#wt-toggle");
      if (injection_check) return;
      const toggle_div = await _ChromeExtension.generateToggleDiv();
    }
    async injectSeralizerButton() {
      const header = document.getElementsByTagName(YoutubeSettings.generic.header.container.tag)[0];
      if (!header) return;
      const buttons_container = header.querySelector("#" + YoutubeSettings.generic.header.buttons.id);
      const injection_spot = header.querySelector("#" + YoutubeSettings.generic.header.buttons.inject.id);
      if (!buttons_container || !injection_spot) return;
      const injection_check = injection_spot.querySelector("#wt-serializer");
      if (injection_check) return;
    }
    async getChannelNameFromChannelPage() {
      if (_ChromeExtension.page_instance.page !== "channel") {
        return;
      }
      ;
      const channel_container = document.getElementsByTagName(YoutubeSettings.channel.channel.container)[0];
      if (!channel_container) {
        console.log("[channel] No channel container");
        return;
      }
      ;
      const channel_tag = channel_container.querySelector(YoutubeSettings.channel.channel.tag);
      if (!channel_tag) {
        console.log("[channel] No channel tag");
        return;
      }
      ;
      const channel_name = channel_tag.innerText;
      return channel_name;
    }
    static async refreshChannels() {
      _ChromeExtension.allowed_channels = [];
      MessageHandler.send({ type: "get-channels" }, (response) => {
        if (response.type === "query-channels") {
          console.log("[serializer] Refreshing channels");
          _ChromeExtension.allowed_channels = response.channels;
        }
      });
    }
    async refreshChannelInjection(div, channel_name) {
      var _a, _b;
      if (!div) {
        return;
      }
      if (!div.dataset) {
        div.dataset = { channel: channel_name };
      }
      if (((_a = div.dataset) == null ? void 0 : _a.channel) !== channel_name) {
        console.warn("[channel] Channel name mismatch (expected: %s, got: %s)", (_b = div.dataset) == null ? void 0 : _b.channel, channel_name);
        div.dataset.channel = channel_name;
      }
      if (_ChromeExtension.allowed_channels.includes(channel_name)) {
        div.innerHTML = `<h2>Blacklist Channel</h2>`;
      } else {
        div.innerHTML = `<h2>Whitelist Channel</h2>`;
      }
    }
    async injectChannel() {
      var _a;
      if (_ChromeExtension.page_instance.page !== "channel") return;
      const injection_check = document.querySelectorAll("#wt-add");
      const channel_name = (_a = await this.getChannelNameFromChannelPage()) != null ? _a : "";
      if (injection_check.length > 0) {
        if (injection_check.length >= 2) {
          console.warn("[channel] Too many Channel Injections, deleting all but one");
          for (let i = 1; i < injection_check.length; i++) {
            injection_check[i].remove();
          }
        }
        if (!injection_check[0]) return;
        await this.refreshChannelInjection(injection_check[0], channel_name != null ? channel_name : "");
        return;
      }
      const container = await PageHandler.WaitForElement(() => document.querySelector(`#` + YoutubeSettings.channel.inject.container.id));
      const injection_spot = container.querySelector("#" + YoutubeSettings.channel.inject.injection_spot.id);
      if (!injection_spot) {
        console.log("[channel] No injection spot");
        return;
      }
      if (!channel_name) {
        return;
      }
      const div = await _ChromeExtension.generateAddDiv(channel_name);
      injection_spot.appendChild(div);
    }
    async deleteShorts() {
      console.log("[inject] Deleting Shorts...");
      const _deleteShorts = () => {
        const shorts = document.getElementsByTagName(YoutubeSettings.home.shorts.tag);
        for (let i = 0; i < shorts.length; i++) {
          const short = shorts[i];
          short.style.display = "none";
        }
      };
      _ChromeExtension.page_instance.onVideoRefresh = _deleteShorts;
    }
    /**
    * @description Searches the current page for any video elements adds them into the array 
    	 @returns Nothing(void)
    */
    async search() {
      console.log("[inject] Starting Search Routine...");
      if (this.searching) return;
      this.searching = true;
      const _grabVideos = async () => {
        const getContainers = () => {
          switch (_ChromeExtension.currentPage) {
            case "channel":
            case "home":
              return document.getElementsByTagName(YoutubeSettings.home.container);
            case "video":
              return document.getElementsByTagName(YoutubeSettings.video.container);
            default:
              return document.getElementsByTagName(YoutubeSettings.home.container);
          }
        };
        let containers = getContainers();
        for (let i = 0; i < containers.length; i++) {
          let videos;
          switch (_ChromeExtension.currentPage) {
            case "channel":
            case "home":
              videos = containers[i].getElementsByTagName(YoutubeSettings.home.yt_video);
              break;
            case "video":
              videos = containers[i].getElementsByTagName(YoutubeSettings.video.yt_video);
              const circles = containers[i].getElementsByTagName(YoutubeSettings.video.yt_circle);
              for (let i2 = 0; i2 < circles.length; i2++) {
                const circle = circles[i2];
                circle.style.opacity = "0";
              }
              break;
            default:
              return;
          }
          for (let z = 0; z < videos.length; z++) {
            const video_dom = videos[z];
            const videof_obj = VideoFactory.createVideo(video_dom);
            const _channel = this.channels.addChannel(new Channel(videof_obj.channelname.name, videof_obj.channelname.name));
            if (_channel)
              _channel.addVideo(videof_obj.video);
          }
        }
      };
      _ChromeExtension.page_instance.onVideoRefresh = _grabVideos;
    }
    async disableVideos() {
      let banned_channels = this.channels.channels.filter((channel) => !_ChromeExtension.allowed_channels.includes(channel.name));
      banned_channels.forEach((channel) => channel.disable());
    }
    async enableVideos() {
      let allowed_channels = this.channels.channels.filter((channel) => _ChromeExtension.allowed_channels.includes(channel.name));
      allowed_channels.forEach((channel) => channel.enable());
    }
    startVideoDisableLoop() {
      console.log("[inject] Starting Video Disable Routine...");
      _ChromeExtension.page_instance.onVideoRefresh = this.disableVideos.bind(this);
    }
    clearCache() {
      this.channels.clearCache();
    }
    refreshCache() {
    }
    static addAllowedChannel(channel_name) {
      if (!_ChromeExtension.allowed_channels.includes(channel_name)) {
        _ChromeExtension.allowed_channels.push(channel_name);
        MessageHandler.addChannel(channel_name);
      }
    }
    static removeAllowedChannel(channel_name) {
      if (_ChromeExtension.allowed_channels.includes(channel_name)) {
        _ChromeExtension.allowed_channels.splice(_ChromeExtension.allowed_channels.indexOf(channel_name), 1);
        MessageHandler.removeChannel(channel_name);
      }
    }
  };
  _ChromeExtension.allowed_channels = [];
  //string
  _ChromeExtension.page_instance = new PageHandler();
  _ChromeExtension.enabled = createState(false);
  var ChromeExtension = _ChromeExtension;
  async function inject(..._) {
    const ce = new ChromeExtension([]);
    console.log("[injector] Injecting...");
    ChromeExtension.page_instance.onVideoRefresh = () => {
      ce.injectHeader();
      ce.injectChannel();
      ce.channels.channels.forEach((channel) => {
        channel.refresh();
      });
    };
    ce.search();
    ce.startVideoDisableLoop();
    ce.deleteShorts();
    Browser.browser.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
      if (request.type === "update") {
        ChromeExtension.page_instance.refreshPage((page, updated) => {
          if (page === "channel" && updated) {
            ChromeExtension.page_instance.WaitUntilHeaderLoaded(() => {
              ce.injectChannel();
              ce.injectHeader();
            });
          }
        });
        ce.clearCache();
      } else if (request.type === "update-channels") {
        console.log("[injector] Updating Channels");
        ce.refreshCache();
      }
    });
    return true;
  }
  inject();
})();
//# sourceMappingURL=index.js.map
