console.log('[tagger framework] loaded');

function tag(tag, ...children) {
	const element = document.createElement(tag);
	element.children = children;
	return element;
}
