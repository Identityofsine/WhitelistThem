import { Component } from "framework/element/component";
import { createState, FxState, Signal } from "framework/state/state";
import { InputComponent } from "./InputComponent";
import { Serializer } from "index";
import { ButtonComponent } from "./ButtonComponent";
import { computed, linkedSignal } from "framework/state/computed";
import '../../styles/syncpage.scss';

const TEMPLATE =
	`
<div id="wt-serializer">
  <sync-toggle></sync-toggle>
	<div id="toggle-page" class="sync-page {0 ? open : close} {1 ? already-rendered : not-rendered}">
		<div class="tag flex column wrap">
			<h2 class="tag text-center">Channel Serializer</h2>
			<channel-list-length-text></channel-list-length-text>
			<input-box class="fill-width">
			</input-box>
			<error-text></error-text>
			<div class="flex column wrap gap-01"> 
			</div>
			<div class="tag flex mt-12 column gap-04 flex-half align-center justify-center">
				<clipboard-button>
				</clipboard-button>
				<clear-button>
				</clear-button>
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
	private readonly channelListLength: Signal<number>

	private readonly clipboardButtonName: Signal<string> = computed(() => "Copy Channel List to Clipboard");
	private readonly clearButtonName: Signal<string> = computed(() => "Clear Channel List");
	private readonly errorMessage: FxState<string> = createState("");

	//components
	private channelListLengthText?: Component<HTMLHeadingElement>;
	private inputComponent?: InputComponent;
	private errorComponent?: Component<HTMLSpanElement>;
	private syncPageToggleButton?: ButtonComponent;
	private clipboardButton?: ButtonComponent;
	private clearButton?: ButtonComponent;

	constructor({ states }: SyncPageProps) {
		super({
			tag: "sync-page",
		});

		this.channelList = states.channelList;
		this.channelListJSON = linkedSignal(() => JSON.stringify(this.channelList() ?? [], null, 2));
		this.channelListLength = computed(() => this.channelList()?.length ?? 0);

		this.channelListJSON.effect((json) => {
			try {
				const object = Serializer.importChannels(json);
				if (Array.isArray(object)) {

					const existingChannels = this.channelList();
					const diff = object.filter(channel => !(existingChannels ?? []).includes(channel));
					if (diff.length <= 0) {
						this.errorMessage.set("");
						return;
					}

					this.channelList.set(object);
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

		super.setContent(TEMPLATE, this.open, this.alreadyRendered);

	}

	protected override postRender(): void {

		const syncToggle = this.elementRef.querySelector("sync-toggle");
		if (syncToggle) {
			if (!this.syncPageToggleButton) {
				this.syncPageToggleButton = new ButtonComponent({
					classSignal: computed(() => ""),
					labelSignal: computed(() => "Channel List"),
					onClick: () => {
						console.debug("SyncPage Toggle Clicked, current state:", this.open());
						this.open.set(!this.open());
					}
				});
			}
			syncToggle.appendChild(this.syncPageToggleButton.elementRef);
		}

		// Toggle Page
		const togglePage = this.elementRef.querySelector("sync-toggle");
		if (togglePage) {
			togglePage.addEventListener("click", (e) => {
				e.stopPropagation();
			});
		}

		const channelListLength = this.elementRef.querySelector("channel-list-length-text");
		if (channelListLength) {
			//if the channelListLengthText component does not exist, create it
			if (!this.channelListLengthText) {
				this.channelListLengthText = new Component<HTMLHeadingElement>({
					tag: "h3",
					template: `<h3 class="tag text-center">{0}</h3>`,
					states: [this.channelListLength]
				});
			}
			channelListLength.appendChild(this.channelListLengthText.elementRef);
		}

		//input box
		const inputBox = this.elementRef.querySelector("input-box");
		if (inputBox) {
			if (!this.inputComponent) {
				this.inputComponent = new InputComponent({
					valueState: this.channelListJSON,
				})
			}
			inputBox.appendChild(this.inputComponent.elementRef);
		}

		const errorText = this.elementRef.querySelector("error-text");
		if (errorText) {
			if (!this.errorComponent) {
				//avoids re-rendering the error component if it already exists
				this.errorComponent = new Component<HTMLSpanElement>({
					tag: "span",
					template: `<span class="tag error">{0}</span>`,
					states: [this.errorMessage]
				});
			}
			errorText.appendChild(this.errorComponent.elementRef);
		}

		const clipboardButton = this.elementRef.querySelector("clipboard-button");
		if (clipboardButton) {
			if (!this.clipboardButton) {
				this.clipboardButton = new ButtonComponent({
					classSignal: computed(() => "primary"),
					labelSignal: this.clipboardButtonName,
					onClick: () => {
						navigator.clipboard.writeText(this.channelListJSON() ?? `[]`);
					}
				});
			}
			clipboardButton.appendChild(this.clipboardButton.elementRef);

		}
		const clearButton = this.elementRef.querySelector("clear-button");
		if (clearButton) {
			if (!this.clearButton) {
				this.clearButton = new ButtonComponent({
					classSignal: computed(() => "danger"),
					labelSignal: this.clearButtonName,
					onClick: () => {
						this.channelList.set([]);
					}
				});
			}
			clearButton.appendChild(this.clearButton.elementRef);
		}

		super.postRender();
	}


}
