console.log('[tagger framework] loaded');
type Tag = keyof HTMLElementTagNameMap;
type Attribute = { [key: string]: any };

function tag(tag: Tag, attr: Attribute = {}, ...children: HTMLElement[]) {
	const element = document.createElement(tag);

	if (attr) {
		Object.keys(attr).forEach((key) => {
			element.setAttribute(key, attr[key]);
		});
	}

	if (children) {
		children.forEach((child) => {
			element.appendChild(child);
		});
	}

	return element;
}

function h2(text: string, attr: Attribute = {}) {
	return tag('h2', { ...attr }, document.createTextNode(text) as any);
}

function tdiv(attr: Attribute = {}, ...children: HTMLElement[]) {
	return tag('div', attr, ...children);
}

function tflex(attr: Attribute = {}, ...children: HTMLElement[]) {
	return tag('div', { class: 'flex', ...attr }, ...children);
}

type Dispatch<T = any> = ((...value: T[]) => void);

function t_toggle_page(className: string, attr: Attribute, ...children: HTMLElement[]): { element: HTMLElement, toggle: Dispatch } {

	const container = tdiv({ class: `toggle-page open ${className}`, ...attr }, ...children);

	function toggle() {
		if (container.classList.contains('open')) {
			container.classList.remove('open');
			return;
		} else {
			container.classList.add('open');
		}
	}

	return { element: container, toggle };
}


