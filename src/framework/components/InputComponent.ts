import { Component } from "framework/element/component";
import { FxState } from "framework/state/state";


type InputComponentProps = {
	element?: HTMLInputElement;
	valueState: FxState<string>;
}

export class InputComponent extends Component<HTMLInputElement> {

	constructor({	element, valueState }: InputComponentProps) {
		super({
			template: `{0}`,
			element: element,
			tag: "input",
			states: [valueState],
		})
	}

	protected override postRender(): void {
		this.elementRef.value = this._states?.[0]?.();
		this.elementRef.classList.add("tag");
		this.elementRef.addEventListener("change", this.handleInput);
		super.postRender();
	}

	private handleInput = (event: Event) => {
		const input = event.target as HTMLInputElement;
		if (this._states?.[0]) {
			this._states[0].set(input.value);
		}
	}
}
