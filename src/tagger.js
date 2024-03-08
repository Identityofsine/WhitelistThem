console.log('[tagger framework] loaded');

function tag(tag, attr, ...children) {
	const element = document.createElement(tag);
	element.children = children;

	if (attr) {
		Object.keys(attr).forEach((key) => {
			element.setAttribute(key, attr[key]);
		});
	}

	return element;
}

function div(...children) {
	return tag('div', ...children);
}
