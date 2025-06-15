import { Component } from "framework/element/component";
import { createState, FxState, Signal } from "framework/state/state";
import { log } from "util/log/log";


type InputComponentProps = {
	element?: HTMLInputElement;
	valueState: FxState<string>;
}

export class InputComponent extends Component<HTMLInputElement> {

	private readonly localState: FxState<string>;
	private lastPosition: number = 0;
	private wasFocused: boolean = false;

	constructor({ element, valueState }: InputComponentProps) {
		super({
			element: element,
			tag: "input",
			alwaysRender: true,
		})
		this.localState = valueState;
		this.setContent(``, this.localState);
	}

	protected override initializeElement(): void {

		this.elementRef.setSelectionRange(this.lastPosition, this.lastPosition);
		this.elementRef.classList.add("tag");
		this.elementRef.type = "text";

		this.elementRef.addEventListener("input", (Event) => {
			const input = Event.target as HTMLInputElement;
			if (this.wasFocused) {
				this.lastPosition = input.selectionStart ?? this.lastPosition ?? 0;
			} else {
				this.wasFocused = true;
			}
			this.localState.set(input.value);
		});

		this.onFocus(() => {
			if (this.wasFocused) {
				log.debug("InputComponent regained focus, restoring last position:", this.lastPosition);
				this.lastPosition += 1;
			} else {
				this.wasFocused = true;
				this.lastPosition = this.elementRef.selectionStart ?? 0;
			}
		})

		this.onBlur(() => {
			log.debug("InputComponent lost focus, last position:", this.lastPosition);
			this.wasFocused = false;
		});

		super.initializeElement();
	}

	protected override postRender(): void {

		if (this.wasFocused) {
			this.elementRef.focus();
			this.elementRef.setSelectionRange(this.lastPosition, this.lastPosition);
			log.debug("Restoring focus and selection range to:", this.lastPosition);
		}

		this.elementRef.value = this.localState?.() ?? "";

		super.postRender();
	}


}
