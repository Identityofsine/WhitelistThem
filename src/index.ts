
class TimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TimeoutError";
	}
}

class Identifiable {
	uuid = "";
	id = "";
	name = "";

	constructor(id: string, name: string) {
		this.uuid = Identifiable.generateUUID();
		this.id = id;
		this.name = name;
	}

	static generateUUID() {
		const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
			return (c === "x" ? (Math.random() * 16 | 0) : (Math.random() * 16 | 0) & 0x3 | 0x8).toString(16);
		});
		return uuid;
	}

	compare(other: Identifiable) {
		return this.id === other.id;
	}

	compareUUID(other: Identifiable) {
		return this.uuid === other.uuid;
	}

}

class Channel extends Identifiable {
	videos: Video[] = [];

	constructor(id: string, name: string) {
		super(id, name);
	}

	doesVideoExist(video: Video) {
		if (video instanceof Video) {
			const first_search = this.videos.find(v => v.compare(video));
			if (first_search) return first_search;
		}
		return false;
	}

	addVideo(video: Video) {
		if (video instanceof Video) {
			const _video = this.doesVideoExist(video);
			if (_video) {
				this.removeVideo(_video);
			}
			video.inject(this);
			this.videos.push(video);
			return video;
		}
		else return false;
	}

	//remove video?
	removeVideo(video: Video) {
		if (video instanceof Video) {
			this.videos = this.videos.filter(v => !v.compare(video));
		}
	}

	enable() {
		this.videos.forEach(video => video.enable());
	}

	disable() {
		this.videos.forEach(video => video.disable());
	}

	refresh() {
		this.videos.forEach(video => video.refresh());
	}

}

class Video extends Identifiable {
	isShort = false;
	dom: HTMLElement | null = null;
	disabled = false;
	injected = false;

	constructor(id: string, name: string, isShort: boolean, dom: HTMLElement) {
		super(id, name);
		this.isShort = isShort;
		this.dom = dom;
	}

	changeInjectionState(plus: boolean) {
		if (!this.dom) return;
		const element = this.dom.querySelector("#whitelist-spot");
		if (!element) return;
		if (plus) {
			element.innerHTML = `<h2>+</h2>`;
		} else {
			element.innerHTML = `<h2>-</h2>`;
		}
	}

	refresh() {
		if (!this.dom) return;
		if (ChromeExtension.enabled) {
			if (this.disabled) {
				this.dom.style.display = "none";
			} else {
				this.dom.style.display = "block";
			}
			return;
		}
		this.dom.style.display = "block";
		this.changeInjectionState(this.disabled);
	}

	disable() {
		if (this.disabled) return;
		if (!this.dom) return;
		if (ChromeExtension.enabled) {
			this.dom.style.display = "none";
		}

		this.changeInjectionState(true);
		this.disabled = true;
	}

	enable() {
		if (!this.disabled) return;
		if (!this.dom) return;
		if (ChromeExtension.enabled) {
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
		element.onmousedown = (e) => {
			onclick_function();
		}
		this.dom.appendChild(element);
		this.dom.dataset.whitelisted = 'true';
	}

}

//static table

const SleepSettings = {
	waiting: 250,
	engine: 900,
	max_attempts: 50,
};

const YoutubeSettings = {
	home: {
		container: "ytd-rich-grid-row",
		yt_video: "ytd-rich-item-renderer",
		yt_video_title: {
			tag: "a",
			id: "video-title-link"
		},
		shorts: {
			tag: "ytd-rich-section-renderer",
			class: "style-scope ytd-rich-grid-renderer"
		}
	},
	video: {
		container: "ytd-watch-next-secondary-results-renderer",
		yt_video: "ytd-compact-video-renderer",
		yt_circle: "ytd-continuation-item-renderer",
		yt_video_link: {
			tag: "a",
			class: "yt-simple-endpoint style-scope ytd-compact-video-renderer"
		},
		yt_video_title: {
			tag: "span",
			id: "video-title"
		},
		channel: {
			container: "ytd-channel-name",
			tag: "yt-formatted-string",
			id: "channel-name",
			link: {
				container: "dismissible",
				tag: "a",
				class: "yt-simple-endpoint style-scope ytd-compact-video-renderer"
			}
		}
	},
	channel: {
		channel: {
			container: "ytd-channel-name",
			tag: "yt-formatted-string",
		},
		inject: {
			container: {
				tag: "div",
				id: "inner-header-container"
			},
			injection_spot: {
				tag: "div",
				id: "buttons",
				inject_id: "wt-add"
			}
		}
	},
	generic: {
		header: {
			container: {
				tag: "ytd-masthead",
				id: "masthead"
			},
			buttons: {
				tag: "div",
				id: "end",
				inject: {
					id: "buttons"
				}
			}
		},
		yt_video: {
			channel: {
				tag: "ytd-channel-name",
				id: { tag: "a" }
			},
			title: {
				tag: "a",
				id: "video-title-link"
			}
		}
	}
}

type ChromeMessage = {
	type: string;
	channel?: string;
	enabled?: boolean;
}

class Browser {
	public static get isFirefox() {
		return navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
	}

}

//communicate with service workers
class MessageHandler {
	static send(message: ChromeMessage, callback?: Dispatch) {
		chrome.runtime.sendMessage(message, (response: any) => {
			var lastError = chrome.runtime.lastError;
			if (lastError) {
				console.error("[MessageHandler] Error: %s", lastError.message);
				return;
			}
			if (callback)
				callback(response);
		});
	}

	static addChannel(channel: string) {
		this.send({ type: "add-channel", channel: channel });
	}

	static removeChannel(channel: string) {
		this.send({ type: "remove-channel", channel: channel });
	}

	static onMessage(callback: Function) {
		chrome.runtime.onMessage.addListener(() => callback());
	}

}



//check if page is still loading

type Pages = "home" | "video" | "channel";
type EngineInstance = {
	engine: string;
	page: Pages;
}

class PageHandler {
	init = false;
	page_loaded = false;
	static engine_running = false;
	page: Pages = "home";
	engine_instance: EngineInstance[] = [];
	_onVideoRefresh: Dispatch[] = [];
	_onPageLoad: Dispatch[] = [];


	constructor() {

	}

	async start() {
		this.getPage().then((page: Pages) => {
			this.page = page;
			console.log("Page: ", this.page);
			this.pageLoaded();
		});
	}

	static craft_engine_instance(instance: string, page: Pages): EngineInstance {
		return {
			engine: instance,
			page: page
		};
	}

	isPageLoading() {
		return !this.page_loaded;
	}

	isVideoOnPage() {
		//check where we are
		let video;
		if (this.page === "home")
			video = document.getElementsByTagName(YoutubeSettings.home.yt_video);
		else
			video = document.getElementsByTagName(YoutubeSettings.video.yt_video);
		return video.length > 0;
	}

	refreshPage(callback = (_page: Pages, _update: boolean) => { }) {
		this.getPage().then((page) => {
			let update = false;
			if (this.page !== page) {
				update = true;
				PageHandler.engine_running = false;
				this.page_loaded = false;
				this.page = page;
				this.pageLoaded();
			}
			callback(page, update);
		});
	}

	static async WaitForElement(div_function: () => any, indefinite = false) {
		let div = div_function();
		let attempts = 0;

		while (!div) {
			if (attempts >= SleepSettings.max_attempts && !indefinite) {
				break;
			}
			await sleep(() => { attempts++ }, SleepSettings.waiting);
			div = div_function();
		}
		if (attempts >= SleepSettings.max_attempts) {
			console.error("[WT] Can't find element, I'm giving up...")
			throw new TimeoutError("Can't find element");
		} else
			return div;
	}

	async WaitUntilHeaderLoaded(callback = () => { }) {

		try {
			let header_container = await PageHandler.WaitForElement(() => document.getElementsByTagName(YoutubeSettings.generic.header.container.tag)[0]);

			let buttons_container = await PageHandler.WaitForElement(() => header_container.querySelector("#" + YoutubeSettings.generic.header.buttons.id));

			callback();

		} catch (e: any) {
			console.error("[inject::header], %s", e.message);
			return;
		}

	}

	async engine() {
		const loop_id = Identifiable.generateUUID();
		const page = this.page;
		if (PageHandler.engine_running) {
			console.log("[%s] Engine already running (%s)", page, loop_id);
			return;
		} else {
			console.log("[%s] Engine not running (%s)", page, loop_id);
		}
		PageHandler.engine_running = true;
		this.engine_instance.push(PageHandler.craft_engine_instance(loop_id, page));
		console.log("[%s] Engine started (%s)", page, loop_id);
		while (this.page_loaded) {
			if (this.page != page) break;

			let another_instance = false;
			this.engine_instance.forEach((instance) => {
				if (instance.engine != loop_id && instance.page == page) another_instance = true;
			});
			if (another_instance) break;

			this._onVideoRefresh.forEach(async (callback: Dispatch) => {
				if (this.page != page) return;
				callback();
			});
			await sleep(() => { }, SleepSettings.engine);
		}
		this.engine_instance = this.engine_instance.filter(instance => instance.engine != loop_id);
		console.log("[%s]Engine stopped (%s)", page, loop_id);
	}

	async pageLoaded() {

		if (ChromeExtension.currentPage == "channel") {
			await PageHandler.WaitForElement(() => document.querySelector(YoutubeSettings.channel.channel.tag), true);
		} else {
			await PageHandler.WaitForElement(() => this.isVideoOnPage(), true);
		}
		this.page_loaded = true;
		this._onPageLoad.forEach(callback => {
			callback();
		});
		this.engine.bind(this)();
	}

	async getPage(): Promise<Pages> {
		return new Promise((resolve, _reject) => {
			chrome.runtime.sendMessage({ type: "get-page" }, (response) => {
				resolve(response.page as Pages);
			});
		});
	}


	/**
	 * @param {Function} callback The callback to be called when a video is refreshed
	 */
	set onVideoRefresh(callback: Dispatch) {
		this._onVideoRefresh.push(callback);
	}

	/**
	 * @param {Function} callback The callback to be called when the page is loaded
	 */
	set onPageLoad(callback: Dispatch) {
		this._onPageLoad.push(callback);
	}

}

class VideoFactory {
	static createVideo(video_dom: HTMLElement) {

		function extractVideoId(url: string) {
			var match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
			return match && match[1];
		}

		function getTitleAndID() {
			const is_home = ChromeExtension.page_instance.page === "home";
			let anchor_tags;
			if (is_home) {
				anchor_tags = video_dom.getElementsByTagName(YoutubeSettings.home.yt_video_title.tag);
			} else {
				anchor_tags = video_dom.getElementsByTagName(YoutubeSettings.video.yt_video_title.tag);
			}

			for (let i = 0; i < anchor_tags.length; i++) {
				const anchor = anchor_tags[i] as HTMLAnchorElement;
				if (is_home) {
					if (anchor.id === YoutubeSettings.home.yt_video_title.id) {
						return { title: anchor.innerText, id: extractVideoId(anchor.href) };
					}
				} else {
					if (anchor.id === YoutubeSettings.video.yt_video_title.id) {
						const href_dom = video_dom.getElementsByTagName(YoutubeSettings.video.yt_video_link.tag)[0] as HTMLAnchorElement;
						const href = href_dom.href;
						return { title: anchor.innerText, id: extractVideoId(href) };
					}
				}
			}
			return { title: '', id: '' };
		}

		function getChannelName() {
			const is_home = ChromeExtension.page_instance.page === "home";

			let channel_tag;
			if (is_home) {
				channel_tag = video_dom.getElementsByTagName(YoutubeSettings.generic.yt_video.channel.tag);
			} else {
				channel_tag = video_dom.getElementsByTagName(YoutubeSettings.video.channel.tag);
			}
			for (let i = 0; i < channel_tag.length; i++) {
				let search;
				if (is_home)
					search = channel_tag[i].getElementsByTagName(YoutubeSettings.generic.yt_video.channel.id.tag)[0] as HTMLAnchorElement;
				else {
					const link_container = video_dom.querySelector("#" + YoutubeSettings.video.channel.link.container);
					if (!link_container) {
						console.error("[channel] No link container");
						return { name: '', id: '' };
					}

					let link_anchor = link_container.getElementsByTagName(YoutubeSettings.video.channel.link.tag);
					let link = "";
					for (let i = 0; i < link_anchor.length; i++) {
						const link_dom = link_anchor[i] as HTMLAnchorElement;
						if (link_dom.className === YoutubeSettings.video.channel.link.class) {
							link = link_dom.href;
							break;
						}
					}

					search = { innerText: (channel_tag[i] as HTMLElement)!.title, href: link };
				}


				if (search) {
					return { name: search.innerText, id: search.href };
				}

			}
			return { name: '', id: '' };

		}

		return { video: new Video(getTitleAndID().id ?? '', getTitleAndID().title, false, video_dom), channelname: getChannelName() };

	}
}

async function sleep(callback: Dispatch, timeout: number) {
	return new Promise((resolve, _reject) => {
		setTimeout(() => {
			resolve(callback());
		}, timeout);
	});
}

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

	static importChannels(channels: any) {
		//TODO: Import channels
		console.error("[Serializer] Importing channels not implemented");
		return undefined;
	}

	/**
		* @param {Channel[]} channel_name_dataset
		* @returns {string} string should be a serialized JSON object that contains the channels
		*/
	static exportChannels(channels: string[]) {
		const json_channels = JSON.stringify(channels);
		return (json_channels);
	}

}

interface HTMLChannelElement extends HTMLElement {
	dataset: {
		channel: string;
	}
}

class ChromeExtension {
	channels = new ChannelCache();
	static allowed_channels: string[] = []; //string
	static page_instance = new PageHandler();
	static enabled: boolean = true;
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
		return new Promise((resolve, _reject) => {
			MessageHandler.send({ type: "get-enabled" }, (response) => {
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

		const flex = tflex(["column", "wrap"], "", {},
			tflex(["column", "align-center"], "gap-01", {},
				tinput("text"),
				tbutton(() => { }, "Submit", "fill-width")
			));
		const page = t_toggle_page("right-0", {}, flex);

		return page;
	}

	static async generateSerializerDiv() {
		const small_page = await this.generateTogglePage();
		const div = tdiv({ id: "wt-serializer" }, small_page.element, th2("Export/Import"));
		div.onclick = () => {
			const export_string = Serializer.exportChannels(ChromeExtension.allowed_channels);
			console.log("[serializer] Exporting: %s", export_string);
			//copy to clipboard
			navigator.clipboard.writeText(export_string).then(() => {
				console.log("[serializer] Copied to clipboard");
			}).catch((err) => {
				console.error("[serializer] Error: %s (clipboard failed)", err);
			});
			//alert("Channels exported to clipboard");
			small_page.toggle();
		}

		return div;
	}

	static async generateToggleDiv() {

		const div = tdiv({ id: "wt-toggle" });

		ChromeExtension.enabled = await ChromeExtension.getEnabled();

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
	}

	static async generateAddDiv(channel: string) {
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
		injection_spot.appendChild(toggle_div);
		await this.injectSeralizerButton();
	}

	async injectSeralizerButton() {
		const header = document.getElementsByTagName(YoutubeSettings.generic.header.container.tag)[0];
		if (!header) return;
		const buttons_container = header.querySelector("#" + YoutubeSettings.generic.header.buttons.id);
		const injection_spot = header.querySelector("#" + YoutubeSettings.generic.header.buttons.inject.id);
		if (!buttons_container || !injection_spot) return;
		const injection_check = injection_spot.querySelector("#wt-serializer");
		if (injection_check) return;
		const serializer_div = await ChromeExtension.generateSerializerDiv();
		injection_spot.appendChild(serializer_div);
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
		let channel_name = await this.getChannelNameFromChannelPage() ?? "";

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

	startVideoDisableLoop() {
		console.log("[inject] Starting Video Disable Routine...");
		ChromeExtension.page_instance.onVideoRefresh = this.disableVideos.bind(this);
	}

	clearCache() {
		this.channels.clearCache();
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
async function inject(...args: any[]) {
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
	chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
		if (request.type === "update") {
			ChromeExtension.page_instance.refreshPage((page, updated) => {
				if (page === "channel" && updated) {
					ChromeExtension.page_instance.WaitUntilHeaderLoaded(() => {
						ce.injectChannel();
						ce.injectHeader();
					});
				}
				ce.clearCache();
			});
		}
	});

	return true;
}

inject();

