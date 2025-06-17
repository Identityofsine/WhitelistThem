import { Component } from "framework/element/component";
import { FxState } from "framework/state/state";
import { ButtonComponent } from "./ButtonComponent";
import { computed } from "framework/state/computed";

const TEMPLATE =
	`<div id="wt-toggle" class="wt-toggle {0 ? 'on' : 'off'}">
		<toggle-button></toggle-button>
	</div>`


type ToggleProps = {
	tag?: string;
	template?: string;
	state: FxState<boolean>;
	onClick?: () => void;
}

export class ToggleComponent extends Component {

	private buttonComponent?: ButtonComponent;

	constructor({ tag, template, state, onClick }: ToggleProps) {
		super({
			tag: tag ?? "toggle-component",
			template: template ?? TEMPLATE,
			states: [state],
			alwaysRender: true,
		});

		onClick && this.onClick(onClick);
	}

	protected override postRender(): void {

		const toggleButton = this.elementRef.querySelector("toggle-button");
		if (toggleButton) {
			if (!this.buttonComponent) {
				this.buttonComponent = new ButtonComponent({
					classSignal: computed(() => `${!this._states[0]() ? "primary" : "danger"}`),
					labelSignal: computed(() => this._states[0]() ? "Disable" : "Enable"),
				});
			}
			toggleButton.replaceWith(this.buttonComponent.elementRef);
		}

		super.postRender();
	}

}
