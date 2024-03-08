"use strict";
console.log('[tagger framework] loaded');
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
function h2(text, attr = {}) {
    return tag('h2', Object.assign({}, attr), document.createTextNode(text));
}
function tdiv(attr = {}, ...children) {
    return tag('div', attr, ...children);
}
function tflex(attr = {}, ...children) {
    return tag('div', Object.assign({ class: 'flex' }, attr), ...children);
}
function t_toggle_page(className, attr, ...children) {
    const container = tdiv(Object.assign({ class: `toggle-page open ${className}` }, attr), ...children);
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
