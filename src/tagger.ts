console.log('[tagger framework] loaded');
type Tag = keyof HTMLElementTagNameMap;
type Attribute = { [key: string]: any };

function flattenString(arr: string[]): string {
	return arr.join(' ');
}

function tag(tag: Tag, attr: Attribute = {}, ...children: HTMLElement[]) {
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

function h2(text: string, attr: Attribute = {}) {
	return tag('h2', { ...attr }, document.createTextNode(text) as any);
}

function tdiv(attr: Attribute = {}, ...children: HTMLElement[]) {
	return tag('div', attr, ...children);
}

type FlexElementProps = "column" | "row" | "align-center" | "align-start" | "align-end" | "justify-center" | "justify-start" | "justify-end" | "justify-between" | "justify-around" | "wrap";
function tflex(props: FlexElementProps[] = [], attr: Attribute = {}, ...children: HTMLElement[]) {
	return tag('div', { class: `flex ${flattenString(props)}`, ...attr }, ...children);
}

type Dispatch<T = any> = ((...value: T[]) => void);

function t_toggle_page(className: string, attr: Attribute, ...children: HTMLElement[]): { element: HTMLElement, toggle: Dispatch } {

	const container = tdiv({ class: `toggle-page ${className}`, ...attr }, ...children);

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


