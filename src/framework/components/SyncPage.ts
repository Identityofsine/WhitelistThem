import { Component } from "framework/element/component";
import { createState, FxState } from "framework/state/state";
import { InputComponent } from "./InputComponent";

const TEMPLATE = 
`
<div id="wt-serializer">
	<h2>Export/Import</h2>
	<div id="toggle-page" class="sync-page {0 ? open : close}">
		<div class="tag flex column wrap">
			<h2 class="tag">Channel Serializer: {1} Channel(s)</h2>
			<input-box class="fill-width">
			</input-box>
			<div class="flex column wrap gap-01"> 
			</div>
		</div>
	</div>
</div>
`

type SyncPageProps = {
	states: {
	  channelList: FxState<string[]>	
	}
}

export class SyncPage extends Component {

  private open: FxState<boolean> = createState(false); 
	private readonly channelList: FxState<string[]>;
	private readonly channelListJSON: FxState<string>;
  private readonly channelListLength: FxState<number>

	constructor({states}: SyncPageProps) {
		super({
			tag: "sync-page",
		});

		this.channelList = states.channelList;
		this.channelListLength = createState(this.channelList()?.length ?? 0);
		this.channelListJSON = createState(JSON.stringify(this.channelList()) ?? "");

		this.channelList.effect((list) => {
			this.channelListLength.set(list.length);
			this.channelListJSON.set(JSON.stringify(list) ?? "");
		});

		super.setContent(TEMPLATE, this.open, this.channelListLength);

		super.onClick(() => {
			this.open.set(!this.open());
		});
	}

	protected override postRender(): void {
		const togglePage = this.elementRef.querySelector("#toggle-page");
		if (togglePage) {
			togglePage.addEventListener("click", (e) => {
				e.stopPropagation();
			});
		}
		const inputBox = this.elementRef.querySelector("input-box"); 
		if (inputBox) {
			const input = new InputComponent({
				valueState: this.channelListJSON,
			})
			inputBox.appendChild(input.elementRef);
		}

		super.postRender();
	}


}
