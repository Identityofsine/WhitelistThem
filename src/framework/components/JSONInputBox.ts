import { Component } from "framework/element/component";

const TEMPLATE = `
	<div class="json-input-box">
	</div>
`

export class JSONInputBox extends Component<HTMLDivElement> {
	constructor() {
		super({
			tag: "json-input-box",
			template: TEMPLATE,
			states: [],
		});

	}
}
