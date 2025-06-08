import { VideoFactory } from './factory/videofactory';
import { YoutubeSettings } from './constants/settings';
import { MessageHandler } from './handler/messagehandler';
import { PageHandler } from './handler/pagehandler';
import { Channel } from './object/channel';
import './styles/styles.scss';
import './styles/tagger.scss';
import { Browser } from './interfaces/browser';
import { createState, FxState, State } from 'framework/state/state';
//check if page is still loading

class ChannelCache {
	channels: Channel[] = []; //Channel

	constructor() {
	}


	doesChannelExist(channel: Channel) {
		if (channel instanceof Channel) {
			return this.channels.find(c => c.compare(channel));
		}
		return false;
	}

	//methods
	addChannel(channel: Channel) {
		if (channel instanceof Channel) {
			const _channel = this.doesChannelExist(channel);
			if (!this.doesChannelExist(channel)) {
				this.channels.push(channel);
				return channel;
			} else {
				return _channel;
			}
		}
	}

	disableVideos() {
		this.channels.forEach(channel => {
			channel.disable();
		});
	}

	enableVideos() {
		this.channels.forEach(channel => {
			channel.enable();
		});
	}

	clearCache() {
		this.channels = [];
	}
}

class Serializer {

	static importChannels(channels: string) {
		try {
			const json_parsed = JSON.parse(channels) as string[];
			if (Array.isArray(json_parsed)) {
				return json_parsed;
			}
			throw new Error(`Invalid JSON : (${channels})`);
		} catch (e) {
			console.error("[serializer::import] Error: %s (obj: %s)", e, channels);
			return undefined;
		}
	}

	static exportChannels(channels: string[]) {
		try {
			const json_channels = JSON.stringify(channels);
			return (json_channels);
		} catch (e) {
			console.error("[serializer::export] Error: %s", e);
			return undefined;
		}
	}

}

interface HTMLChannelElement extends HTMLElement {
	dataset: {
		channel: string;
	}
}

export class ChromeExtension {
	channels = new ChannelCache();
	static allowed_channels: string[] = []; //string
	static page_instance = new PageHandler();
	static enabled: FxState<boolean> = createState(false);
	searching = false;
	started = false;

	constructor(allowed_channels: string[]) {
		ChromeExtension.allowed_channels = allowed_channels;
		ChromeExtension.page_instance.start();
		this.start();
	}


	static get currentPage() {
		return ChromeExtension.page_instance.page;
	}

	//methods

	static async getEnabled(): Promise<boolean> {
		return new Promise((resolve, _) => {
			MessageHandler.send({ type: "get-enabled" }, (response: any) => {
				resolve(response.enabled);
			});
		});
	}

	static setEnabled(enabled: boolean) {
		MessageHandler.send({ type: "set-enabled", enabled: enabled });
	}

	async start() {
		MessageHandler.send({ type: "get-channels" }, (response) => {
			if (response.type === "query-channels") {
				ChromeExtension.allowed_channels = response.channels;
			}
		});
	}

	private static async generateTogglePage() {
		/**
		const channel_input = tinput("text", "Input Channel JSON Here", "");
		const flex = tflex(["column", "wrap"], "gap-02", {},
			th2("Channel Serializer"),
			channel_input.input,
			tflex(["column", "align-center"], "gap-01", {},
				tbutton(() => {
					const channels = Serializer.importChannels(channel_input.state.state());
					if (channels) {
						MessageHandler.send({ type: "set-channels", channels: channels }, () => {
							ChromeExtension.refreshChannels();
						});
					} else {
						alert("Invalid JSON/ChannelScript");
					}
				}, "Submit", "fill-width")
			),
			tbutton(() => {
				const export_string = Serializer.exportChannels(ChromeExtension.allowed_channels);
				console.log("[serializer] Exporting: %s", export_string);
				//copy to clipboard
				navigator.clipboard.writeText(export_string ?? "[]").then(() => {
					console.log("[serializer] Copied to clipboard");
				}).catch((err) => {
					console.error("[serializer] Error: %s (clipboard failed)", err);
				});

				alert("Channels exported to clipboard");

			}, "Channels to Clipboard", "fill-width"),
		);
		const page = t_toggle_page("right-0", {}, flex);
		return page;
		*/
	}

	static async generateSerializerDiv() {
		/**
		const small_page = await this.generateTogglePage();
		const div = tdiv({ id: "wt-serializer" }, small_page.element, th2("Export/Import"));
		div.onclick = () => {
			small_page.toggle();
		}

		return div;
		*/
	}

	static async generateToggleDiv() {

		ChromeExtension.enabled.set(await ChromeExtension.getEnabled());

		/**
		const div = tdiv({ id: "wt-toggle" });


		if (ChromeExtension.enabled) {
			div.innerHTML = `<h2>Enabled</h2>`;
			div.classList.add("on");
		}
		else {
			div.innerHTML = `<h2>Disabled</h2>`;
			div.classList.remove("on");
		}

		div.onclick = () => {
			ChromeExtension.enabled = !ChromeExtension.enabled;
			ChromeExtension.setEnabled(ChromeExtension.enabled);
			if (ChromeExtension.enabled) {
				div.innerHTML = `<h2>Enabled</h2>`;
				div.classList.add("on");
			} else {
				div.innerHTML = `<h2>Disabled</h2>`;
				div.classList.remove("on");
			}
		}
		return div;
		*/
	}

	static async generateAddDiv(channel: string) {
		/**
		const div = tdiv({ id: YoutubeSettings.channel.inject.injection_spot.inject_id, dataset: { channel: channel } });
		if (ChromeExtension.allowed_channels.includes(channel))
			div.innerHTML = `<h2>Blacklist Channel</h2>`;
		else
			div.innerHTML = `<h2>Whitelist Channel</h2>`;
		div.onclick = () => {
			const channel_name_dataset = div.dataset.channel;
			if (!channel_name_dataset) return;
			if (ChromeExtension.allowed_channels.includes(channel_name_dataset ?? "")) {
				ChromeExtension.removeAllowedChannel(channel_name_dataset ?? "");
				div.innerHTML = `<h2>Whitelist Channel</h2>`;
			} else {
				ChromeExtension.addAllowedChannel(channel_name_dataset ?? "");
				div.innerHTML = `<h2>Blacklist Channel</h2>`;
			}
		}
		return div;
		*/
	}

	async injectHeader() {
		const header = document.getElementsByTagName(YoutubeSettings.generic.header.container.tag)[0];
		if (!header) return;
		const buttons_container = header.querySelector("#" + YoutubeSettings.generic.header.buttons.id);
		const injection_spot = header.querySelector("#" + YoutubeSettings.generic.header.buttons.inject.id);
		if (!buttons_container || !injection_spot) return;
		const injection_check = injection_spot.querySelector("#wt-toggle");
		if (injection_check) return;
		const toggle_div = await ChromeExtension.generateToggleDiv();
		/**
		injection_spot.appendChild(toggle_div);
		await this.injectSeralizerButton();
		*/
	}

	async injectSeralizerButton() {
		const header = document.getElementsByTagName(YoutubeSettings.generic.header.container.tag)[0];
		if (!header) return;
		const buttons_container = header.querySelector("#" + YoutubeSettings.generic.header.buttons.id);
		const injection_spot = header.querySelector("#" + YoutubeSettings.generic.header.buttons.inject.id);
		if (!buttons_container || !injection_spot) return;
		const injection_check = injection_spot.querySelector("#wt-serializer");
		if (injection_check) return;
		//const serializer_div = await ChromeExtension.generateSerializerDiv();
		//injection_spot.appendChild(serializer_div);
	}

	async getChannelNameFromChannelPage(): Promise<string | undefined> {
		if (ChromeExtension.page_instance.page !== "channel") {
			return;
		};
		const channel_container = document.getElementsByTagName(YoutubeSettings.channel.channel.container)[0];
		if (!channel_container) {
			console.log("[channel] No channel container");
			return;
		};
		const channel_tag = channel_container.querySelector(YoutubeSettings.channel.channel.tag) as HTMLElement;
		if (!channel_tag) {
			console.log("[channel] No channel tag");
			return;
		};
		const channel_name = channel_tag.innerText;

		return channel_name;
	}

	static async refreshChannels() {
		ChromeExtension.allowed_channels = [];
		MessageHandler.send({ type: "get-channels" }, (response) => {
			if (response.type === "query-channels") {
				console.log("[serializer] Refreshing channels");
				ChromeExtension.allowed_channels = response.channels;
			}
		});
	}

	async refreshChannelInjection(div: HTMLChannelElement, channel_name: string) {
		if (!div) {
			return;
		}
		if (!div.dataset) {
			div.dataset = { channel: channel_name };
		}
		if (div.dataset?.channel !== channel_name) {
			console.warn("[channel] Channel name mismatch (expected: %s, got: %s)", div.dataset?.channel, channel_name);
			div.dataset.channel = channel_name;
		}
		if (ChromeExtension.allowed_channels.includes(channel_name)) {
			div.innerHTML = `<h2>Blacklist Channel</h2>`;
		}
		else {
			div.innerHTML = `<h2>Whitelist Channel</h2>`;
		}
	}

	async injectChannel() {

		if (ChromeExtension.page_instance.page !== "channel") return;

		const injection_check = document.querySelectorAll("#wt-add");
		const channel_name = await this.getChannelNameFromChannelPage() ?? "";

		if (injection_check.length > 0) {
			if (injection_check.length >= 2) {
				console.warn("[channel] Too many Channel Injections, deleting all but one");
				for (let i = 1; i < injection_check.length; i++) {
					injection_check[i].remove();
				}
			}
			if (!injection_check[0]) return;
			await this.refreshChannelInjection(injection_check[0] as HTMLChannelElement, channel_name ?? "");
			return;
		}

		const container = await PageHandler.WaitForElement(() => document.querySelector(`#` + YoutubeSettings.channel.inject.container.id));
		const injection_spot = container.querySelector("#" + YoutubeSettings.channel.inject.injection_spot.id);

		if (!injection_spot) {
			console.log("[channel] No injection spot");
			return;
		}

		if (!channel_name) {
			return;
		}

		const div = await ChromeExtension.generateAddDiv(channel_name);
		injection_spot.appendChild(div);
	}

	async deleteShorts() {
		console.log("[inject] Deleting Shorts...");
		const _deleteShorts = () => {
			const shorts = document.getElementsByTagName(YoutubeSettings.home.shorts.tag);
			for (let i = 0; i < shorts.length; i++) {
				const short = shorts[i] as HTMLElement;
				short.style.display = "none";
			}
		}
		ChromeExtension.page_instance.onVideoRefresh = _deleteShorts;
	}


	/**
	* @description Searches the current page for any video elements adds them into the array 
		 @returns Nothing(void)
	*/
	async search() {

		console.log("[inject] Starting Search Routine...");
		if (this.searching) return;
		this.searching = true;

		const _grabVideos = async () => {
			const getContainers = () => {
				switch (ChromeExtension.currentPage) {
					case "channel":
					case "home":
						return document.getElementsByTagName(YoutubeSettings.home.container);
					case "video":
						return document.getElementsByTagName(YoutubeSettings.video.container);
					default:
						return document.getElementsByTagName(YoutubeSettings.home.container);
				}
			}

			let containers = getContainers();
			for (let i = 0; i < containers.length; i++) {
				let videos;
				switch (ChromeExtension.currentPage) {
					case "channel":
					case "home":
						videos = containers[i].getElementsByTagName(YoutubeSettings.home.yt_video);
						break;
					case "video":
						videos = containers[i].getElementsByTagName(YoutubeSettings.video.yt_video);
						const circles = containers[i].getElementsByTagName(YoutubeSettings.video.yt_circle);
						for (let i = 0; i < circles.length; i++) {
							const circle = circles[i] as HTMLElement;
							circle.style.opacity = "0";
						}
						break;
					default:
						return;
				}
				for (let z = 0; z < videos.length; z++) {
					const video_dom = videos[z] as HTMLElement;
					const videof_obj = VideoFactory.createVideo(video_dom);
					const _channel = this.channels.addChannel(new Channel(videof_obj.channelname.name, videof_obj.channelname.name));
					if (_channel)
						_channel.addVideo(videof_obj.video);
				}
			}
		}

		ChromeExtension.page_instance.onVideoRefresh = _grabVideos;
	}

	async disableVideos() {
		let banned_channels = this.channels.channels.filter(channel => !ChromeExtension.allowed_channels.includes(channel.name));
		banned_channels.forEach(channel => channel.disable());
	}

	async enableVideos() {
		let allowed_channels = this.channels.channels.filter(channel => ChromeExtension.allowed_channels.includes(channel.name));
		allowed_channels.forEach(channel => channel.enable());
	}

	startVideoDisableLoop() {
		console.log("[inject] Starting Video Disable Routine...");
		ChromeExtension.page_instance.onVideoRefresh = this.disableVideos.bind(this);
	}

	clearCache() {
		this.channels.clearCache();
	}

	refreshCache() {
	}


	static addAllowedChannel(channel_name: string) {
		if (!ChromeExtension.allowed_channels.includes(channel_name)) {
			ChromeExtension.allowed_channels.push(channel_name);
			MessageHandler.addChannel(channel_name);
		}
	}

	static removeAllowedChannel(channel_name: string) {
		if (ChromeExtension.allowed_channels.includes(channel_name)) {
			ChromeExtension.allowed_channels.splice(ChromeExtension.allowed_channels.indexOf(channel_name), 1);
			MessageHandler.removeChannel(channel_name);
		}
	}

}


//used by the background script
async function inject(..._: any[]) {
	const ce = new ChromeExtension([]);

	console.log("[injector] Injecting...");
	ChromeExtension.page_instance.onVideoRefresh = () => {
		ce.injectHeader();
		ce.injectChannel();
		ce.channels.channels.forEach(channel => {
			channel.refresh();
		});
	}

	ce.search();
	ce.startVideoDisableLoop();
	ce.deleteShorts();

	//run chrome listener on update, and check the page
	//@ts-ignore
	Browser.browser.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
		if (request.type === "update") {
			ChromeExtension.page_instance.refreshPage((page, updated) => {
				if (page === "channel" && updated) {
					ChromeExtension.page_instance.WaitUntilHeaderLoaded(() => {
						ce.injectChannel();
						ce.injectHeader();
					});
				}
			});
			ce.clearCache();
		} else if (request.type === "update-channels") {
			console.log("[injector] Updating Channels");
			ce.refreshCache();
		}
	});


	return true;
}

inject();

