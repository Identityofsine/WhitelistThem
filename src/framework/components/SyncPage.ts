import { Component } from "framework/element/component";
import { createState, FxState } from "framework/state/state";
import { InputComponent } from "./InputComponent";
import { Serializer } from "index";

const TEMPLATE = 
`
<div id="wt-serializer">
	<h2>Export/Import</h2>
	<div id="toggle-page" class="sync-page {0 ? open : close}">
		<div class="tag flex column wrap">
			<h2 class="tag">Channel Serializer: {1} Channel(s)</h2>
			<input-box class="fill-width">
			</input-box>
			<span class="tag error">{2}</span>
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
	private readonly errorMessage: FxState<string> = createState("");	
	private inputComponent?: InputComponent;

	constructor({states}: SyncPageProps) {
		super({
			tag: "sync-page",
		});

		this.channelList = states.channelList;
		this.channelListLength = createState(this.channelList()?.length ?? 0);
		this.channelListJSON = createState(JSON.stringify(this.channelList()) ?? "");

		this.channelList.effect((list) => {
			this.channelListLength.set(list.length);
			const json = Serializer.exportChannels(list);
			this.channelListJSON.set(json ?? "[]");
		});

		this.channelListJSON.effect((json) => {
			try {
				const object = Serializer.importChannels(json);
				if (Array.isArray(object)) {
					this.channelList.set([...object]);
					this.errorMessage.set("");
				} else {
					this.errorMessage.set("Invalid JSON format for channel list (Must be an Array). This will not be saved.");
					console.error("Invalid JSON format for channel list:", json);
				}
			}
			catch (e) {
				this.errorMessage.set("Invalid JSON format for channel list. This will not be saved.");
				console.error("Invalid JSON format for channel list:", e);
			}
		});

		super.setContent(TEMPLATE, this.open, this.channelListLength, this.errorMessage);

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
			if (!this.inputComponent) {
				this.inputComponent = new InputComponent({
					valueState: this.channelListJSON,
				})
			}
			inputBox.appendChild(this.inputComponent.elementRef);
		}

		super.postRender();
	}


}
