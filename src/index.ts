import { VideoFactory } from "./factory/videofactory";
import { YoutubeSettings } from "./constants/settings";
import { MessageHandler } from "./handler/messagehandler";
import { PageHandler } from "./handler/pagehandler";
import { Channel } from "./object/channel";
import "./styles/styles.scss";
import "./styles/tagger.scss";
import { Browser } from "./interfaces/browser";
import { createState, FxState } from "framework/state/state";
import { ToggleComponent } from "framework/components/ToggleComponent";
import { SyncPage } from "framework/components/SyncPage";
import { log } from "util/log/log";
import { ButtonComponent } from "framework/components/ButtonComponent";
import { computed } from "framework/state/computed";
//check if page is still loading

class ChannelCache {
	channels: Channel[] = []; //Channel

	constructor() { }

	doesChannelExist(channel: Channel) {
		if (channel instanceof Channel) {
			return this.channels.find((c) => c.compare(channel));
		}
		return false;
	}

	//methods
	addChannel(channel: Channel) {
		if (channel instanceof Channel) {
			const _channel = this.doesChannelExist(channel);
			if (!this.doesChannelExist(channel)) {
				channel.inject();
				this.channels.push(channel);
				return channel;
			} else {
				channel.cleanUp();
				return _channel;
			}
		}
	}

	disableVideos() {
		this.channels.forEach((channel) => {
			channel.disable();
		});
	}

	enableVideos() {
		this.channels.forEach((channel) => {
			channel.enable();
		});
	}

	clearCache() {
		this.channels = [];
	}
}

export class Serializer {
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
			return json_channels;
		} catch (e) {
			console.error("[serializer::export] Error: %s", e);
			return undefined;
		}
	}
}

interface HTMLChannelElement extends HTMLElement {
	dataset: {
		channel: string;
	};
}

export class ChromeExtension {
	channels = new ChannelCache();
	static readonly allowed_channels: FxState<string[]> = createState<string[]>(
		[],
	); //string
	static page_instance = new PageHandler();
	static enabled: FxState<boolean> = createState(false);
	searching = false;
	started = false;

	constructor(allowed_channels: string[]) {
		ChromeExtension.allowed_channels.set(allowed_channels);
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
				ChromeExtension.allowed_channels.set(response.channels);
			}
		});
	}

	static async generateSerializerDiv() {
		return new SyncPage({
			states: {
				channelList: ChromeExtension.allowed_channels,
			},
		});
	}

	static async generateToggleDiv() {
		ChromeExtension.enabled.set(await ChromeExtension.getEnabled());

		const div = new ToggleComponent({
			tag: "enable-disable-component",
			state: ChromeExtension.enabled,
			onClick: () => {
				const value = ChromeExtension.enabled();
				ChromeExtension.enabled.set(!value);
				ChromeExtension.setEnabled(!value);
			},
		});
		div.elementRef.id = YoutubeSettings.generic.header.buttons.inject.id;

		return div;
	}

	async injectHeader() {
		const header = document.getElementsByTagName(
			YoutubeSettings.generic.header.container.tag,
		)[0];
		if (!header) return;
		const buttons_container = header.querySelector(
			"#" + YoutubeSettings.generic.header.buttons.id,
		);
		const injection_spot: HTMLElement | null = header.querySelector(
			"#" + YoutubeSettings.generic.header.buttons.inject.id,
		);

		if (!buttons_container || !injection_spot) return;
		const injection_check = injection_spot.querySelectorAll("enable-disable-component");
		if (injection_check.length > 0) {
			if (injection_check.length >= 2) {
				console.warn(
					"[channel] Too many Header Injections, deleting all but one",
				);
				for (let i = 1; i < injection_check.length; i++) {
					injection_check[i].remove();
				}
			}
			if (!injection_check[0]) return;
			return;
		}
		if (injection_check.length <= 0) {
			const toggle_div = await ChromeExtension.generateToggleDiv();
			injection_spot.appendChild(toggle_div.elementRef);
		};
		await this.injectSeralizerButton(injection_spot as HTMLElement);
	}

	async injectSeralizerButton(injection_spot: HTMLElement) {
		const injection_check = injection_spot.querySelector("sync-page");
		if (injection_check) return;
		const serializer_div = await ChromeExtension.generateSerializerDiv();
		injection_spot.appendChild(serializer_div.elementRef);
	}

	async getChannelNameFromChannelPage(): Promise<string | undefined> {
		if (ChromeExtension.page_instance.page !== "channel") {
			return;
		}
		const channel_container = document.getElementsByTagName(
			YoutubeSettings.channel.channel.container,
		)[0];
		if (!channel_container) {
			console.log("[channel] No channel container");
			return;
		}
		const channel_tag = channel_container.querySelector(
			YoutubeSettings.channel.channel.tag,
		) as HTMLElement;
		if (!channel_tag) {
			console.log("[channel] No channel tag");
			return;
		}
		const channel_name = channel_tag.innerText;

		return channel_name;
	}

	static async refreshChannels() {
		ChromeExtension.allowed_channels.set([]);
		MessageHandler.send({ type: "get-channels" }, (response) => {
			if (response.type === "query-channels") {
				console.log("[serializer] Refreshing channels");
				ChromeExtension.allowed_channels.set(response.channels);
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
			console.warn(
				"[channel] Channel name mismatch (expected: %s, got: %s)",
				div.dataset?.channel,
				channel_name,
			);
			div.dataset.channel = channel_name;
		}
		if (ChromeExtension.allowed_channels()?.includes(channel_name)) {
			div.innerHTML = `<h2>Blacklist Channel</h2>`;
		} else {
			div.innerHTML = `<h2>Whitelist Channel</h2>`;
		}
	}

	async injectChannel() {
		if (ChromeExtension.page_instance.page !== "channel") return;

		const injection_check = document.querySelectorAll("#wt-add");
		const channel_name = (await this.getChannelNameFromChannelPage()) ?? "";

		if (injection_check.length > 0) {
			if (injection_check.length >= 2) {
				console.warn(
					"[channel] Too many Channel Injections, deleting all but one",
				);
				for (let i = 1; i < injection_check.length; i++) {
					injection_check[i].remove();
				}
			}
			if (!injection_check[0]) return;
			return;
		}

		const container = await PageHandler.WaitForElement(() =>
			document.querySelector(YoutubeSettings.channel.inject.container.tag),
		);
		const injection_spot: HTMLElement = container.querySelector(
			YoutubeSettings.channel.inject.injection_spot.tag,
		);

		if (!injection_spot) {
			console.log("[channel] No injection spot");
			return;
		}

		injection_spot.style = `${injection_spot.style.cssText} ${YoutubeSettings.channel.inject.injection_spot.inject_styles}`;

		if (!channel_name) {
			return;
		}

		const component = new ButtonComponent({
			labelSignal: computed(() => `${ChromeExtension?.allowed_channels?.()?.includes(channel_name) ? 'Blacklist' : 'Whitelist'}`),
			onClick(_) {
				const isWhitelisted = ChromeExtension?.allowed_channels?.()?.includes(channel_name);
				log.debug("[channel] Button clicked for channel: %s - (whitelisted:%s)", channel_name, isWhitelisted);
				if (!isWhitelisted) {
					MessageHandler.addChannel(channel_name);
					ChromeExtension.addAllowedChannel(channel_name, () => { });
				} else {
					MessageHandler.removeChannel(channel_name);
					ChromeExtension.removeAllowedChannel(channel_name, () => { });
				}
			},
		})

		component.elementRef.id = YoutubeSettings.channel.inject.injection_spot.inject_id;
		injection_spot.appendChild(component.elementRef);
	}

	async deleteShorts() {
		console.log("[inject] Deleting Shorts...");
		const _deleteShorts = () => {
			const shorts = document.getElementsByTagName(
				YoutubeSettings.home.shorts.tag,
			);
			for (let i = 0; i < shorts.length; i++) {
				const short = shorts[i] as HTMLElement;
				short.style.display = "none";
			}
		};
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
						return document.getElementsByTagName(
							YoutubeSettings.home.container,
						);
					case "video":
						return document.getElementsByTagName(
							YoutubeSettings.video.container,
						);
					default:
						return document.getElementsByTagName(
							YoutubeSettings.home.container,
						);
				}
			};

			let containers = getContainers();
			for (let i = 0; i < containers.length; i++) {
				let videos;
				switch (ChromeExtension.currentPage) {
					case "channel":
					case "home":
						videos = containers[i].getElementsByTagName(
							YoutubeSettings.home.yt_video,
						);
						break;
					case "video":
						videos = containers[i].getElementsByTagName(
							YoutubeSettings.video.yt_video,
						);
						const circles = containers[i].getElementsByTagName(
							YoutubeSettings.video.yt_circle,
						);
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
					if (!videof_obj) {
						log.info("[inject] No video found in container %s", containers[i]);
						continue;
					}
					const _channel = this.channels.addChannel(
						new Channel(
							videof_obj.channelname.name,
							videof_obj.channelname.name,
						),
					);
					if (_channel) _channel.addVideo(videof_obj.video);
				}
			}
		};

		ChromeExtension.page_instance.onVideoRefresh = _grabVideos;
	}

	async disableVideos() {
		let banned_channels = this.channels.channels.filter(
			(channel) => !ChromeExtension.allowed_channels()?.includes(channel.name),
		);
		banned_channels.forEach(async (channel) => {
			if (channel.disabledState === false) {
				console.log(`[inject] Disabling channel: ${channel.name}`);
				channel.disable();
			}
		});
	}

	async enableVideos() {
		let allowed_channels = this.channels.channels.filter((channel) =>
			ChromeExtension.allowed_channels()?.includes(channel.name),
		);
		allowed_channels.forEach((channel) => channel.enable());
	}

	startVideoDisableLoop() {
		console.log("[inject] Starting Video Disable Routine...");
		ChromeExtension.page_instance.onVideoRefresh = async () => {
			this.disableVideos.bind(this)();
		};
		ChromeExtension.allowed_channels.effect(() => {
			this.disableVideos.bind(this)();
			this.enableVideos.bind(this)();
		});
	}

	clearCache() {
		this.channels.clearCache();
	}

	refreshCache() { }

	static addAllowedChannel(channel_name: string, callback?: () => void) {
		if (!ChromeExtension.allowed_channels()?.includes(channel_name)) {
			ChromeExtension.allowed_channels?.set([
				...(ChromeExtension.allowed_channels() ?? []),
				channel_name,
			]);
			MessageHandler.addChannel(channel_name, callback);
		}
	}

	static removeAllowedChannel(channel_name: string, callback?: () => void) {
		if (ChromeExtension.allowed_channels()?.includes(channel_name)) {
			ChromeExtension.allowed_channels.set(
				ChromeExtension.allowed_channels()?.filter(
					(name) => name !== channel_name,
				) ?? [],
			);

			MessageHandler.removeChannel(channel_name, callback);
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
		ce.channels.channels.forEach((channel) => {
			channel.refresh();
		});
	};

	ce.search();
	ce.startVideoDisableLoop();
	ce.deleteShorts();

	//run chrome listener on update, and check the page
	//@ts-ignore
	Browser.browser.runtime.onMessage.addListener(
		(request, _sender, _sendResponse) => {
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
		},
	);

	return true;
}

inject();
