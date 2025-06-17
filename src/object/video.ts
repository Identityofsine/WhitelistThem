import { FxState } from "framework/state/state";
import { ChromeExtension } from "..";
import { Identifiable } from "./abstract/identifiable";
import { ToggleComponent } from "framework/components/ToggleComponent";
import { Disposable } from "interfaces/disposable";

export class Video extends Identifiable implements Disposable {
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
				<h2>{0 ? '+' : '-'}</h2>
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
	}

	cleanUp() {
		if (this.dom && this.dom.dataset.whitelisted) {
			this.dom.removeChild(this.dom.querySelector("#whitelist-spot")!);
			this.dom.dataset.whitelisted = "";
		}
		this.injected = false;
		this.disabled = null;
		this.dom = null;
	}
}
