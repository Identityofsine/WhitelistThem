import { FxState } from "framework/state/state";
import { ChromeExtension } from "..";
import { Identifiable } from "./abstract/identifiable";
import { ToggleComponent } from "framework/components/ToggleComponent";
import { MessageHandler } from "handler/messagehandler";

export class Video extends Identifiable {
	isShort = false;
	dom: HTMLElement | null = null;
	disabled: FxState<boolean> | null = null;
	injected = false;

	constructor(id: string, name: string, isShort: boolean, dom: HTMLElement) {
		super(id, name);
		this.isShort = isShort;
		this.dom = dom;
		ChromeExtension.enabled.effect(() => {
			this.refresh();
		});
	}

	refresh() {
		if (!this.dom) return;
		if (!this.disabled) return;
		if (ChromeExtension.enabled()) {
			if (this.disabled()) {
				this.dom.style.display = "none";
			} else {
				this.dom.style.display = "block";
			}
		} else {
			this.dom.style.display = "block";
		}
	}

	/**
	 */
	inject(disabled: FxState<boolean>) {
		if (!this.dom) return;
		if (this.dom.dataset.whitelisted) {
			this.injected = true;
			return;
		}

		this.disabled = disabled;
		const element = new ToggleComponent({
			tag: "video-toggle-component",
			template: `
			<div id="whitelist-spot" class="">
				<h2>{0 ? + : -}</h2>
			</div>
			`,
			state: disabled,
			onClick: () => {
				const state = disabled();
				disabled.set(!state);
			},
		});

		disabled.effect(() => {
			this.refresh();
		});

		this.dom.appendChild(element.elementRef);
		this.dom.dataset.whitelisted = "true";

		/**

		const element = tdiv();

		if (!this.disabled)
			element.innerHTML = `<h2>-</h2>`;
		else
			element.innerHTML = `<h2>+</h2>`

		element.id = "whitelist-spot";

		const onclick_function = () => {
			if (this.disabled) {
				MessageHandler.addChannel(channel.name);
				ChromeExtension.addAllowedChannel(channel.name);
				this.enable();
				channel.enable();
			} else {
				MessageHandler.removeChannel(channel.name);
				ChromeExtension.removeAllowedChannel(channel.name);
				this.disable();
				channel.disable();
			}
		};

		element.onclick = onclick_function.bind(this);
		//adjust for macbook trackpad
		element.onmousedown = (_) => {
			onclick_function();
		}
		*/
	}
}
