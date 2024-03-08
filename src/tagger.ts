console.log('[tagger framework] loaded');
type Tag = keyof HTMLElementTagNameMap;
type Attribute = { [key: string]: any };


type State<T> = {
	state: DispatchWithResult<void, T>;
	setState: Dispatch<T>;
}

class Updater {
	private static instance: Updater;
	private events: Dispatch[] = [];

	private constructor() { }
	static getInstance() {
		if (!Updater.instance) {
			Updater.instance = new Updater();
		}
		return Updater.instance;
	}

	public registerEvent(event: Dispatch) {
		this.events.push(event);
	}

	public update() {
		this.events.forEach((event) => {
			event();
		});
	}
}

function createState<T>(initialState: T): State<T> {
	let state = initialState;
	const setState = (newState: T) => {
		state = newState;
		Updater.getInstance().update();
	};
	return { state: () => state, setState };
}


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

function th2(text: string, attr: Attribute = {}) {
	return tag('h2', { ...attr }, document.createTextNode(text) as any);
}

function tdiv(attr: Attribute = {}, ...children: HTMLElement[]) {
	return tag('div', attr, ...children);
}

type InputElementProps = "text" | "password" | "checkbox" | "radio" | "submit" | "reset" | "file" | "hidden" | "image" | "button";


function tinput(props: InputElementProps, placeHolder: string = "", defaultValue: string = "", onValueChange?: Dispatch<string>, className: string = "", attr: Attribute = {}) {
	const state: State<string> = createState(defaultValue);
	const input = tag('input', { type: props, placeholder: placeHolder, class: className, ...attr }) as HTMLInputElement;
	input.value = defaultValue;
	input.addEventListener("input", (e: Event) => {
		onValueChange && onValueChange(state.state());
	})
	function update() {
		input.value = state.state();
	}
	Updater.getInstance().registerEvent(update);
	return { input, state };
}

function tbutton(onclick: Dispatch, text: string, className: string = "", attr: Attribute = {}, ...children: HTMLElement[]) {
	const button = tag('button', { class: className, ...attr }, ...children);
	button.appendChild(document.createTextNode(text));
	button.onclick = (e) => {
		e.preventDefault();
		onclick();
	}
	return button;
}

type FlexElementProps = "column" | "row" | "align-center" | "align-start" | "align-end" | "justify-center" | "justify-start" | "justify-end" | "justify-between" | "justify-around" | "wrap";
function tflex(props: FlexElementProps[] = [], className: string = "", attr: Attribute = {}, ...children: HTMLElement[]) {
	return tag('div', { class: `flex ${flattenString(props)} ${className}`, ...attr }, ...children);
}

type Dispatch<T = any> = ((...value: T[]) => void);
type DispatchWithResult<A = any, R = any> = ((...value: A[]) => R);

function t_toggle_page(className: string = "", attr: Attribute = {}, ...children: HTMLElement[]): { element: HTMLElement, toggle: Dispatch } {

	const container = tdiv({ class: `toggle-page ${className}`, ...attr }, ...children);
	container.onclick = (e: MouseEvent) => {
		//absorb click from parent
		e.stopPropagation();
	}

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


