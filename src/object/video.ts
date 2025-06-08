import { ChromeExtension } from "..";
import { MessageHandler } from "../handler/messagehandler";
import { Identifiable } from "./abstract/identifiable";
import { Channel } from "./channel";

export class Video extends Identifiable {
	isShort = false;
	dom: HTMLElement | null = null;
	disabled = false;
	injected = false;

	constructor(id: string, name: string, isShort: boolean, dom: HTMLElement) {
		super(id, name);
		this.isShort = isShort;
		this.dom = dom;
		ChromeExtension.enabled.effect(() => {
			this.refresh();
		});
	}

	changeInjectionState(plus: boolean) {
		/**
		if (!this.dom) return;
		const element = this.dom.querySelector("#whitelist-spot");
		if (!element) return;
		if (plus) {
			element.innerHTML = `<h2>+</h2>`;
		} else {
			element.innerHTML = `<h2>-</h2>`;
		}
		*/
	}

	refresh() {
		if (!this.dom) return;
		if (ChromeExtension.enabled()) {
			if (this.disabled) {
				this.dom.style.display = "none";
			} else {
				this.dom.style.display = "block";
			}
		} else {
			this.dom.style.display = "block";
		}
		this.changeInjectionState(this.disabled);
	}

	disable() {
		if (this.disabled) return;
		if (!this.dom) return;
		if (ChromeExtension.enabled()) {
			this.dom.style.display = "none";
		}

		this.changeInjectionState(true);
		this.disabled = true;
	}

	enable() {
		if (!this.dom) return;
		if (ChromeExtension.enabled()) {
			this.dom.style.display = "block";
		}
		this.changeInjectionState(false);
		this.disabled = false;
	}

	/**
	 * @param {Channel} channel
	 */
	inject(channel: Channel) {
		if (!this.dom) return;
		if (this.dom.dataset.whitelisted) {
			this.injected = true;
			return;
		}
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
		this.dom.appendChild(element);
		this.dom.dataset.whitelisted = 'true';
		*/
	}
}
