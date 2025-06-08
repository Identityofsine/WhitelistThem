import { Component } from "framework/element/component";
import { FxState } from "framework/state/state";

const TEMPLATE = 
`<div id="wt-toggle" class="wt-toggle {0 ? on : off}">
	<h2>{0 ? Enabled : Disabled}</h2>
</div>` 


type ToggleProps = {
	state: FxState<boolean>;
	onClick?: (state: Partial<MouseEvent>) => void;
}

export class ToggleComponent extends Component {

	constructor({state, onClick}: ToggleProps) {
		super({
			tag: "toggle-component",
			template: TEMPLATE,
			states: [state],
		});
		onClick && this.onClick(onClick)
	}
	
}
