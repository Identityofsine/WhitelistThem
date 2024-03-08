"use strict";
console.log('[tagger framework] loaded');
function createState(initialState) {
    let state = initialState;
    const setState = (newState) => {
        state = newState;
    };
    return { state, setState };
}
function flattenString(arr) {
    return arr.join(' ');
}
function tag(tag, attr = {}, ...children) {
    const element = document.createElement(tag);
    if (attr) {
        Object.keys(attr).forEach((key) => {
            element.setAttribute(key, attr[key]);
        });
        element.classList.add('tag');
    }
    if (children) {
        children.forEach((child) => {
            element.appendChild(child);
        });
    }
    return element;
}
function th2(text, attr = {}) {
    return tag('h2', Object.assign({}, attr), document.createTextNode(text));
}
function tdiv(attr = {}, ...children) {
    return tag('div', attr, ...children);
}
function tinput(props, defaultValue = "", onValueChange, className = "", attr = {}) {
    return tag('input', Object.assign({ type: props, class: className }, attr));
}
function tbutton(onclick, text, className = "", attr = {}, ...children) {
    const button = tag('button', Object.assign({ class: className }, attr), ...children);
    button.appendChild(document.createTextNode(text));
    button.onclick = (e) => {
        e.preventDefault();
        onclick();
    };
    return button;
}
function tflex(props = [], className = "", attr = {}, ...children) {
    return tag('div', Object.assign({ class: `flex ${flattenString(props)} ${className}` }, attr), ...children);
}
function t_toggle_page(className = "", attr = {}, ...children) {
    const container = tdiv(Object.assign({ class: `toggle-page ${className}` }, attr), ...children);
    container.onclick = (e) => {
        //absorb click from parent
        e.stopPropagation();
    };
    function toggle() {
        if (container.classList.contains('open')) {
            container.classList.remove('open');
            return;
        }
        else {
            container.classList.add('open');
        }
    }
    return { element: container, toggle };
}
