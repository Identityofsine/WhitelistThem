import { Component } from "framework/element/component";
import { createState, FxState } from "framework/state/state";


type InputComponentProps = {
	element?: HTMLInputElement;
	valueState: FxState<string>;
}

export class InputComponent extends Component<HTMLInputElement> {

	private readonly localState: FxState<string>;

	constructor({	element, valueState }: InputComponentProps) {
		super({
			element: element,
			tag: "input",
		})
		this.localState = valueState; 
		this.setContent(``, this.localState);
	}

	protected override postRender(): void {
		this.elementRef.value = this.localState?.() ?? "";
		this.elementRef.type = "text";
		this.elementRef.classList.add("tag");
		this.elementRef.addEventListener("input", (Event) => {
			const input = Event.target as HTMLInputElement;
			this.localState.set(input.value);
		});
		super.postRender();
	}


}
