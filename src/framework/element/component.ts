import { createState, Signal } from "framework/state/state";
import { HTMLActions } from "interfaces/component";
import { Dispatch } from "interfaces/dispatch";
import { Identifiable } from "object/abstract/identifiable";

const REGEX_EXPRESSION = /\{([^{}]+)\}/g;

export type ComponentProps<T extends HTMLElement = HTMLElement> = {
	tag?: string;
	template?: string;
	states?: Signal<any>[];
	context?: Record<string, any>;
	alwaysRender?: boolean;
	element?: T;
}

export class Component<T extends HTMLElement = HTMLElement> implements HTMLActions {

	private element: T;
	private initalizedElement: boolean = false;
	private htmlTemplate: string = ``;
	protected _states: Signal<any>[] = [];
	protected _context: Record<string, any> = {};
	private _events$: Dispatch<void, void>[] = [];

	protected readonly alreadyRendered = createState(false);

	constructor(props?: ComponentProps<T>) {
		const tag = props?.tag ?? 'component';
		this.element = props?.element ?? document.createElement(tag) as T;
		this._context = props?.context ?? {};
		this.setContent(props?.template ?? ``, ...(props?.states ?? []));
	}

	get elementRef(): T {
		return this.element;
	}

	/**
	 * Enhanced template system supporting:
	 * - State references: {0}, {1}, etc.
	 * - Ternary expressions: {0 ? 'true' : 'false'}
	 * - Property access: {0.property}, {0.nested.prop}
	 * - Method calls: {0.method()}, {0.method(arg)}
	 * - Complex expressions: {0 + 1}, {0 > 5 ? 'big' : 'small'}
	 * - Context variables: {$contextVar}
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
		if (this.element) {
			const expressions = this.parseExpressions(this.htmlTemplate);
			let newHTML = this.htmlTemplate;

			// Process expressions in reverse order to maintain correct indices
			for (let i = expressions.length - 1; i >= 0; i--) {
				const expr = expressions[i];
				try {
					const result = this.evaluateExpression(expr.expression);
					const resultString = result === null || result === undefined ? '' : String(result);
					newHTML = newHTML.slice(0, expr.start) + resultString + newHTML.slice(expr.end);
				} catch (error) {
					console.warn(`[Component] Expression evaluation failed: ${expr.expression}`, error);
					newHTML = newHTML.slice(0, expr.start) + '' + newHTML.slice(expr.end);
				}
			}

			this.element.innerHTML = newHTML;
			this.postRender();
		} else {
			console.warn("Element is not defined, cannot render component.");
		}
	}

	private parseExpressions(template: string): Array<{ expression: string, start: number, end: number }> {
		const expressions: Array<{ expression: string, start: number, end: number }> = [];
		let match;

		while ((match = REGEX_EXPRESSION.exec(template)) !== null) {
			expressions.push({
				expression: match[1].trim(),
				start: match.index,
				end: match.index + match[0].length
			});
		}

		return expressions;
	}

	private evaluateExpression(expr: string): any {
		// Handle context variables (prefixed with $)
		if (expr.startsWith('$')) {
			const contextKey = expr.slice(1);
			return this._context[contextKey];
		}

		// Create evaluation context
		const context = {
			...this._context,
			// Add state variables as numbered references
			...this._states.reduce((acc, state, index) => {
				acc[index.toString()] = state();
				return acc;
			}, {} as Record<string, any>)
		};

		// Enhanced expression evaluator
		return this.safeEvaluate(expr, context);
	}

	private safeEvaluate(expr: string, context: Record<string, any>): any {
		try {
			// Handle ternary expressions
			const ternaryMatch = expr.match(/(.+?)\s*\?\s*(.+?)\s*:\s*(.+)/);
			if (ternaryMatch) {
				const [, condition, trueValue, falseValue] = ternaryMatch;
				const conditionResult = this.safeEvaluate(condition.trim(), context);
				const targetExpr = conditionResult ? trueValue.trim() : falseValue.trim();
				return this.evaluateSimpleExpression(targetExpr, context);
			}

			return this.evaluateSimpleExpression(expr, context);
		} catch (error) {
			console.warn(`[Component] Expression evaluation error: ${expr}`, error);
			return '';
		}
	}

	private evaluateSimpleExpression(expr: string, context: Record<string, any>): any {
		// Handle string literals
		if ((expr.startsWith('"') && expr.endsWith('"')) ||
			(expr.startsWith("'") && expr.endsWith("'"))) {
			return expr.slice(1, -1);
		}

		// Handle simple variable access (including state references)
		if (Object.prototype.hasOwnProperty.call(context, expr)) {
			return context[expr];
		}

		// Handle numbers (only if not found in context)
		if (/^\d+(\.\d+)?$/.test(expr)) {
			return parseFloat(expr);
		}

		// Handle boolean literals
		if (expr === 'true') return true;
		if (expr === 'false') return false;
		if (expr === 'null') return null;
		if (expr === 'undefined') return undefined;

		// Handle property access and method calls
		if (expr.includes('.') || expr.includes('(')) {
			return this.evaluatePropertyAccess(expr, context);
		}

		// Handle basic arithmetic and comparison
		if (/[\+\-\*\/\>\<\=\!]/.test(expr)) {
			return this.evaluateArithmeticExpression(expr, context);
		}

		// Fallback: return as string
		return expr;
	}

	private evaluatePropertyAccess(expr: string, context: Record<string, any>): any {
		// Handle method calls: obj.method() or obj.method(args)
		const methodMatch = expr.match(/^(\w+(?:\.\w+)*)\(([^)]*)\)$/);
		if (methodMatch) {
			const [, path, argsStr] = methodMatch;
			const obj = this.resolvePath(path, context);
			if (typeof obj === 'function') {
				const args = argsStr ? this.parseArguments(argsStr, context) : [];
				return obj.apply(this.getParentObject(path, context), args);
			}
			return obj;
		}

		// Handle property access: obj.prop or obj.nested.prop
		return this.resolvePath(expr, context);
	}

	private resolvePath(path: string, context: Record<string, any>): any {
		const parts = path.split('.');
		let current = context[parts[0]];

		for (let i = 1; i < parts.length; i++) {
			if (current === null || current === undefined) {
				return undefined;
			}
			current = current[parts[i]];
		}

		return current;
	}

	private getParentObject(path: string, context: Record<string, any>): any {
		const parts = path.split('.');
		if (parts.length === 1) {
			return context;
		}

		let current = context[parts[0]];
		for (let i = 1; i < parts.length - 1; i++) {
			if (current === null || current === undefined) {
				return undefined;
			}
			current = current[parts[i]];
		}

		return current;
	}

	private parseArguments(argsStr: string, context: Record<string, any>): any[] {
		if (!argsStr.trim()) return [];

		// Simple argument parsing - could be enhanced for complex nested expressions
		const args = argsStr.split(',').map(arg => arg.trim());
		return args.map(arg => this.evaluateSimpleExpression(arg, context));
	}

	private evaluateArithmeticExpression(expr: string, context: Record<string, any>): any {
		// Handle simple comparisons and arithmetic
		const operators = [
			{ op: '===', fn: (a: any, b: any) => a === b },
			{ op: '!==', fn: (a: any, b: any) => a !== b },
			{ op: '==', fn: (a: any, b: any) => a == b },
			{ op: '!=', fn: (a: any, b: any) => a != b },
			{ op: '>=', fn: (a: any, b: any) => a >= b },
			{ op: '<=', fn: (a: any, b: any) => a <= b },
			{ op: '>', fn: (a: any, b: any) => a > b },
			{ op: '<', fn: (a: any, b: any) => a < b },
			{ op: '+', fn: (a: any, b: any) => a + b },
			{ op: '-', fn: (a: any, b: any) => a - b },
			{ op: '*', fn: (a: any, b: any) => a * b },
			{ op: '/', fn: (a: any, b: any) => a / b },
		];

		for (const { op, fn } of operators) {
			const parts = expr.split(op);
			if (parts.length === 2) {
				const left = this.evaluateSimpleExpression(parts[0].trim(), context);
				const right = this.evaluateSimpleExpression(parts[1].trim(), context);
				return fn(left, right);
			}
		}

		// If no operator found, try to resolve as variable
		return context[expr] || expr;
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
