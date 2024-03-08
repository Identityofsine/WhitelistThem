console.log('[tagger framework] loaded');
type Tag = keyof HTMLElementTagNameMap;
type Attribute = { [key: string]: string };

function tag(tag: Tag, attr: Attribute = {}, ...children: HTMLElement[]) {
	const element = document.createElement(tag);

	if (attr) {
		Object.keys(attr).forEach((key) => {
			element.setAttribute(key, attr[key]);
		});
	}

	return element;
}

function div(attr: Attribute, ...children: HTMLElement[]) {
	return tag('div', attr, ...children);
}
