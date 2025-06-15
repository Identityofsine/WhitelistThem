import { Computed } from "framework/state/computed";
import { createState, FxState, Signal } from "framework/state/state";
import { HTMLActions } from "interfaces/component";
import { Dispatch } from "interfaces/dispatch";
import { Identifiable } from "object/abstract/identifiable";

const REGEX_TEMPLATE = /\{\d+(.*?)\}/g;
const REGEX_TENTATIVE = /\{\d+\s*\?\s*[^:{}]+\s*:\s*[^{}]+\}/;
const REGEX_TENTATIVE_TRUE = /\?\s*([^:}]+?)\s*:/g;
const REGEX_TENTATIVE_FALSE = /:\s*([^}]+?)\s*}/g;
const REGEX_TENTATIVE_REMOVE_SYMBOL = /\{*\?*:*\}*[\s]*/g;
const REGEX_STATE = /\s*(\d+)/

export type ComponentProps<T extends HTMLElement = HTMLElement> = {
	tag?: string;
	template?: string;
	states?: Signal<any>[];
	alwaysRender?: boolean;
	element?: T;
}

export class Component<T extends HTMLElement = HTMLElement> implements HTMLActions {

	private element: T;
	private initalizedElement: boolean = false;
	private htmlTemplate: string = ``;
	protected _states: Signal<any>[] = [];
	private _events$: Dispatch<void, void>[] = [];

	protected readonly alreadyRendered = createState(false);

	constructor(props?: ComponentProps<T>) {
		const tag = props?.tag ?? 'component';
		this.element = props?.element ?? document.createElement(tag) as T;
		this.setContent(props?.template ?? ``, ...(props?.states ?? []));
	}

	get elementRef(): T {
		return this.element;
	}

	/**
		* html template should be set like the java log4j2 template: <div>{}</div>
		*/
	setContent(html: string, ...args: Signal<any>[]) {
		this.onDestroy();
		if (args.length > 0) {
			this._states = args;
			this._states.forEach((state) => {
				const event = state.effect(() => this.render());
				this._events$.push(event);
			});
		}
		this.htmlTemplate = html.replace(/[\n\r\t]/g, ``).trim();
		this.render();
	}

	onDestroy() {
		this._events$.forEach((event) => event());
		this._events$ = [];
	}

	private render() {
		// Render the component's HTML template
		// This is a placeholder for actual rendering logic
		if (this.element) {
			const htmlTemplateCount = (this.htmlTemplate.match(/{}/g) || []).length;
			if (htmlTemplateCount !== this._states.length) {
				//console.error(new Error("[Component] Mismatch between number of placeholders and states provided."));
			}
			const needToBeParsed = TemplateParser.parse(this.htmlTemplate);
			needToBeParsed.forEach((item) => {
				const stateIndex = item.stateIndex;
				if (stateIndex >= 0 && stateIndex < this._states.length) {
					const stateContent = this._states[stateIndex]();
					if (stateContent !== undefined) {
						item.updateValue(stateContent);
					}
				} else {
					item.updateValue(``);
				}
			});
			const newHTML = TemplateParser.rebuild(this.htmlTemplate, needToBeParsed);

			this.element.innerHTML = newHTML;
			this.postRender();

		} else {
			console.warn("Element is not defined, cannot render component.");
		}
	}


	// This method is called after the component has been rendered
	protected postRender(): void {
		if (!this.initalizedElement) {
			this.initializeElement();
			this.initalizedElement = true;
		}
		if (this.element) {
			this.element.id = this.element.id || Identifiable.generateUUID();
			this.element.classList.add(this.constructor.name.toLowerCase());
		} else {
			console.warn("Element is not defined, cannot post render component.");
		}

	}

	protected initializeElement(): void {
		this.alreadyRendered.set(true);
	}


	onClick(listener: Dispatch<Partial<MouseEvent>>): void {
		if (this.element) {
			this.element.addEventListener("click", (event: MouseEvent) => {
				listener(event);
			});
		} else {
			console.warn("Element is not defined, cannot attach click listener.");
		}
	}

	onMouseOver(listener: Dispatch<Partial<MouseEvent>>): void {
		if (this.element) {
			this.element.addEventListener("mouseover", (event: MouseEvent) => {
				listener(event);
			});
		} else {
			console.warn("Element is not defined, cannot attach mouseover listener.");
		}
	}

	onMouseOut(listener: Dispatch<Partial<MouseEvent>>): void {
		if (this.element) {
			this.element.addEventListener("mouseout", (event: MouseEvent) => {
				listener(event);
			});
		} else {
			console.warn("Element is not defined, cannot attach mouseout listener.");
		}
	}

	onFocus(listener: Dispatch<Partial<FocusEvent>>): void {
		if (this.element) {
			this.element.addEventListener("focus", (event: FocusEvent) => {
				listener(event);
			});
		} else {
			console.warn("Element is not defined, cannot attach focus listener.");
		}
	}

	onBlur(listener: Dispatch<Partial<FocusEvent>>): void {
		if (this.element) {
			this.element.addEventListener("blur", (event: FocusEvent) => {
				listener(event);
			});
		} else {
			console.warn("Element is not defined, cannot attach blur listener.");
		}
	}

}


class TemplateParsed {
	readonly id: string = Identifiable.generateUUID();
	//-1 = no state
	readonly stateIndex: number = -1;
	readonly offset: number = 0;
	private content: string = ``;
	private length: number = 0;
	readonly originalLength: number = 0;
	readonly source: string = ``;

	constructor(content: string, offset: number, source: string, stateIndex: number = -1) {
		this.content = content;
		this.offset = offset;
		this.source = source;
		this.length = content.length;
		this.originalLength = content.length;
		this.stateIndex = stateIndex;
	}

	private isTentative(): boolean {
		return REGEX_TENTATIVE.test(this.content);
	}

	updateValue(value: string) {
		const isTentative = this.isTentative();
		if (isTentative) {
			//set the value to the True or False tentative expression
			const tentativeTrue = this.content.match(REGEX_TENTATIVE_TRUE)?.find((match) => match !== undefined);
			const tentativeFalse = this.content.match(REGEX_TENTATIVE_FALSE)?.find((match) => match !== undefined);
			if (tentativeTrue && tentativeFalse) {
				if (value) {
					value = tentativeTrue.replace(REGEX_TENTATIVE_REMOVE_SYMBOL, ``);
				} else {
					value = tentativeFalse.replace(REGEX_TENTATIVE_REMOVE_SYMBOL, ``);
				}
			} else {
				console.warn(`[TemplateParsed] Tentative expression is not valid: ${this.content}`);
				return;
			}
		}
		// replace the digit or expression (have a check here) {0} -> value, or {0 ? True : False} -> True or False	
		const content = this.content.replace(REGEX_TEMPLATE, value);
		this.setContent(content);
	}

	setContent(content: string) {
		this.content = content;
		this.length = content.length;
	}

	getContent(): string {
		return this.content;
	}

	get lengthValue(): number {
		return this.length;
	}

}

class TemplateParser {

	static parse(template: string): TemplateParsed[] {
		const parsed: TemplateParsed[] = [];

		// state index is in the first number of the template, e.g. {0} or {1}
		for (const match of template.matchAll(REGEX_TEMPLATE)) {
			const content = match[0];
			const offset = match.index || 0;
			// Extract the state index from the content, e.g. {0} -> 0
			const stateIndexMatch = content.match(REGEX_STATE);
			const source = template;
			const parsedItem = new TemplateParsed(content, offset, source, stateIndexMatch ? parseInt(stateIndexMatch[1], 10) : -1);
			parsed.push(parsedItem);
		}

		return parsed;
	}

	static rebuild(template: string, parsed: TemplateParsed[]): string {
		let rebuiltTemplate = template;
		let offsetDelta = 0;
		parsed.forEach((item) => {
			const offset = item.offset + offsetDelta;
			if (item.stateIndex >= 0) {
				// Replace the placeholder with the content of the state
				const stateContent = item.getContent();
				rebuiltTemplate = rebuiltTemplate.slice(0, offset) + stateContent + rebuiltTemplate.slice(offset + item.originalLength);
				offsetDelta += stateContent.length - item.originalLength;
			} else {
				// Just remove the placeholder
				rebuiltTemplate = rebuiltTemplate.slice(0, offset) + rebuiltTemplate.slice(offset);
			}
		});
		return rebuiltTemplate;
	}
} 
