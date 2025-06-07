"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };

  // src/framework/tagger.ts
  console.log("[tagger framework] loaded");
  var Updater = class _Updater {
    constructor() {
      this.events = [];
    }
    static getInstance() {
      if (!_Updater.instance) {
        _Updater.instance = new _Updater();
      }
      return _Updater.instance;
    }
    registerEvent(event) {
      this.events.push(event);
    }
    update() {
      this.events.forEach((event) => {
        event();
      });
    }
  };
  function createState(initialState) {
    let state = initialState;
    const setState = (newState) => {
      state = newState;
      Updater.getInstance().update();
    };
    return { state: () => state, setState };
  }
  function flattenString(arr) {
    return arr.join(" ");
  }
  function tag(tag2, attr = {}, ...children) {
    const element = document.createElement(tag2);
    if (attr) {
      Object.keys(attr).forEach((key) => {
        element.setAttribute(key, attr[key]);
      });
      element.classList.add("tag");
    }
    if (children) {
      children.forEach((child) => {
        element.appendChild(child);
      });
    }
    return element;
  }
  function th2(text, attr = {}) {
    return tag("h2", __spreadValues({}, attr), document.createTextNode(text));
  }
  function tdiv(attr = {}, ...children) {
    return tag("div", attr, ...children);
  }
  function tinput(props, placeHolder = "", defaultValue = "", onValueChange, className = "", attr = {}) {
    const state = createState(defaultValue);
    const input = tag("input", __spreadValues({ type: props, placeholder: placeHolder, class: className }, attr));
    input.value = defaultValue;
    input.addEventListener("input", (_) => {
      onValueChange && onValueChange(state.state());
      state.setState(input.value);
    });
    function update() {
      input.value = state.state();
    }
    Updater.getInstance().registerEvent(update);
    return { input, state };
  }
  function tbutton(onclick, text, className = "", attr = {}, ...children) {
    const button = tag("button", __spreadValues({ class: className }, attr), ...children);
    button.appendChild(document.createTextNode(text));
    button.onclick = (e) => {
      e.preventDefault();
      onclick();
    };
    return button;
  }
  function tflex(props = [], className = "", attr = {}, ...children) {
    return tag("div", __spreadValues({ class: `flex ${flattenString(props)} ${className}` }, attr), ...children);
  }
  function t_toggle_page(className = "", attr = {}, ...children) {
    const container = tdiv(__spreadValues({ class: `toggle-page ${className}` }, attr), ...children);
    container.onclick = (e) => {
      e.stopPropagation();
    };
    function toggle() {
      if (container.classList.contains("open")) {
        container.classList.remove("open");
        return;
      } else {
        container.classList.add("open");
      }
    }
    return { element: container, toggle };
  }
})();
//# sourceMappingURL=tagger.js.map
