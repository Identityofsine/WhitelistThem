"use strict";
console.log('[tagger framework] loaded');
function tag(tag, attr = {}, ...children) {
    const element = document.createElement(tag);
    if (attr) {
        Object.keys(attr).forEach((key) => {
            element.setAttribute(key, attr[key]);
        });
    }
    return element;
}
function div(attr, ...children) {
    return tag('div', attr, ...children);
}
