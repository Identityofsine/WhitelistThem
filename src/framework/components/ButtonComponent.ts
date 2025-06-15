import { Component } from "framework/element/component";
import { computed } from "framework/state/computed";
import { Signal } from "framework/state/state";

const TEMPLATE =
	`<button class="tag button-component {0}">
		<span class="button-component__label">{1}</span>
	</button>`

type ButtonComponentProps = {
	element?: HTMLButtonElement;
	classSignal?: Signal<string>;
	labelSignal?: Signal<string>;
	onClick?: (event: MouseEvent) => void;
};

export class ButtonComponent extends Component<HTMLButtonElement> {

	readonly classSignal: Signal<string>;
	readonly labelSignal: Signal<string>;
	readonly _props: ButtonComponentProps;

	constructor(props: ButtonComponentProps) {
		super({
			tag: "button-component",
			element: props.element,
			template: TEMPLATE,
			states: [],
		})
		this._props = props;
		this.classSignal = computed<string>(props.classSignal ?? (() => ""));
		this.labelSignal = computed<string>(props.labelSignal ?? (() => "Button"));

		this.setContent(TEMPLATE, this.classSignal, this.labelSignal);
	}

	protected override postRender(): void {
		this.elementRef.addEventListener("click", (event: MouseEvent) => {
			if (this._props.onClick) {
				this._props.onClick(event);
			}
		});
		super.postRender();
	}
}
