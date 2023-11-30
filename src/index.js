class Identifiable {
	uuid = "";
	id = "";
	name = "";

	constructor(id, name) {
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

	compare(other) {
		return this.id === other.id;
	}

	compareUUID(other) {
		return this.uuid === other.uuid;
	}

}

class Channel extends Identifiable {
	videos = [];

	constructor(id, name) {
		super(id, name);
	}

	doesVideoExist(video) {
		if (video instanceof Video) {
			const first_search = this.videos.find(v => v.compare(video));
			if (first_search) return first_search;
		}
		return false;
	}

	addVideo(video) {
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
	removeVideo(video) {
		if (video instanceof Video) {
			this.videos = this.videos.filter(v => !v.compare(video));
		}
	}

}

class Video extends Identifiable {
	isShort = false;
	dom = null;
	disabled = false;
	injected = false;

	constructor(id, name, isShort, dom) {
		super(id, name);
		this.isShort = isShort;
		this.dom = dom;
	}

	changeInjectionState(plus) {
		if (!this.dom) return;
		const element = this.dom.querySelector("#whitelist-spot");
		if (plus) {
			element.innerHTML = `<h2>+</h2>`;
		} else {
			element.innerHTML = `<h2>-</h2>`;
		}
	}

	refresh() {
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
		if (ChromeExtension.enabled) {
			this.dom.style.display = "none";
		}

		this.changeInjectionState(true);
		this.disabled = true;
	}

	enable() {
		if (!this.disabled) return;
		if (ChromeExtension.enabled) {
			this.dom.style.display = "block";
		}

		this.changeInjectionState(false);
		this.disabled = false;
	}

	/**
	 * @param {Channel} channel
	 */
	inject(channel) {
		if (this.dom.dataset.whitelisted) {
			this.injected = true;
			return;
		}

		const element = document.createElement("div");

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
			} else {
				MessageHandler.removeChannel(channel.name);
				ChromeExtension.removeAllowedChannel(channel.name);
				this.disable();
			}
		};

		element.onclick = onclick_function.bind(this);
		//adjust for macbook trackpad
		element.onmousedown = (e) => {
			onclick_function();
		}
		this.dom.appendChild(element);
		this.dom.dataset.whitelisted = true;
	}

}

//static table
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


//communicate with service workers
class MessageHandler {
	static send(message, callback) {
		chrome.runtime.sendMessage(message, callback);
	}

	static addChannel(channel) {
		this.send({ type: "add-channel", channel: channel });
	}

	static removeChannel(channel) {
		this.send({ type: "remove-channel", channel: channel });
	}

	static onMessage(callback) {
		chrome.runtime.onMessage.addListener(callback);
	}

}



//check if page is still loading

class PageHandler {
	init = false;
	page_loaded = false;
	static engine_running = false;
	page = "home";
	_onVideoRefresh = [];
	_onPageLoad = [];


	constructor() {
		this.getPage().then((page) => {
			this.page = page;
			console.log("Page: ", this.page);
			this.pageLoaded();
		});
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

	refreshPage(callback = () => { }) {
		this.getPage().then((page) => {
			if (this.page !== page) {
				PageHandler.engine_running = false;
				this.page_loaded = false;
				if (this.page === "channel") {
					//todo: remove channel
					this.page = "home";
				} else {
					this.page = page;
				}
				this.pageLoaded();
			}
			callback();
		});
	}

	async WaitUntilHeaderLoaded(callback = () => { }) {
		let header_container = document.getElementsByTagName(YoutubeSettings.generic.header.container.tag)[0];
		while (!header_container) {
			header_container = document.getElementsByTagName(YoutubeSettings.generic.header.container.tag)[0];
		}
		let buttons_container = header_container.querySelector("#" + YoutubeSettings.generic.header.buttons.id);
		while (!buttons_container) {
			await sleep(() => { }, 25);
			buttons_container = header_container.querySelector("#" + YoutubeSettings.generic.header.buttons.id);
			console.log("Waiting for buttons container");
		}
		callback();
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
		console.log("[%s]Engine started (%s)", page, loop_id);
		while (this.page_loaded) {
			if (this.page != page) break;
			this._onVideoRefresh.forEach(async (callback) => {
				if (this.page != page) return;
				callback();
			});
			await sleep(() => { }, 25);
		}
		console.log("[%s]Engine stopped (%s)", page, loop_id);
	}

	async pageLoaded() {
		while (!this.isVideoOnPage()) {
			await sleep(() => { }, 25);
		}
		this.page_loaded = true;
		this._onPageLoad.forEach(callback => {
			callback();
		});
		this.engine.bind(this)();
	}

	async getPage() {
		return new Promise((resolve, _reject) => {
			chrome.runtime.sendMessage({ type: "get-page" }, (response) => {
				resolve(response.page);
			});
		});
	}


	/**
	 * @param {Function} callback The callback to be called when a video is refreshed
	 */
	set onVideoRefresh(callback = (_page) => { }) {
		this._onVideoRefresh.push(callback);
	}

	/**
	 * @param {Function} callback The callback to be called when the page is loaded
	 */
	set onPageLoad(callback) {
		this._onPageLoad.push(callback);
	}

}

class VideoFactory {
	static createVideo(video_dom) {

		function extractVideoId(url) {
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
				const anchor = anchor_tags[i];
				if (is_home) {
					if (anchor.id === YoutubeSettings.home.yt_video_title.id) {
						return { title: anchor.innerText, id: extractVideoId(anchor.href) };
					}
				} else {
					if (anchor.id === YoutubeSettings.video.yt_video_title.id) {
						const href = video_dom.getElementsByTagName(YoutubeSettings.video.yt_video_link.tag)[0].href;
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
					search = channel_tag[i].getElementsByTagName(YoutubeSettings.generic.yt_video.channel.id.tag)[0];
				else {
					const link_container = video_dom.querySelector("#" + YoutubeSettings.video.channel.link.container);
					let link_anchor = link_container.getElementsByTagName(YoutubeSettings.video.channel.link.tag);
					let link = "";
					for (let i = 0; i < link_anchor.length; i++) {
						if (link_anchor[i].className === YoutubeSettings.video.channel.link.class) {
							link = link_anchor[i];
							break;
						}
					}

					search = { innerText: channel_tag[i]?.title, href: link.href };
				}


				if (search) {
					return { name: search.innerText, id: search.href };
				}

			}
			return { name: '', id: '' };

		}

		return { video: new Video(getTitleAndID().id, getTitleAndID().title, false, video_dom), channelname: getChannelName() };

	}
}

async function sleep(callback, timeout) {
	return new Promise((resolve, _reject) => {
		setTimeout(() => {
			resolve(callback());
		}, timeout);
	});
}

class ChannelCache {
	channels = []; //Channel

	constructor() {
	}

	get channels() {
		return this.channel;
	}

	doesChannelExist(channel) {
		if (channel instanceof Channel) {
			return this.channels.find(c => c.compare(channel));
		}
		return false;
	}

	//methods
	addChannel(channel) {
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

	clearCache() {
		this.channels = [];
	}
}

class ChromeExtension {
	channels = new ChannelCache();
	static allowed_channels = []; //string
	static page_instance = new PageHandler();
	static enabled = true;
	searching = false;
	started = false;

	constructor(allowed_channels) {
		ChromeExtension.allowed_channels = allowed_channels;
		this.start();
	}

	get channels() {
		return this.channel;
	}

	//methods

	static async getEnabled() {
		return new Promise((resolve, _reject) => {
			MessageHandler.send({ type: "get-enabled" }, (response) => {
				resolve(response.enabled);
			});
		});
	}

	static setEnabled(enabled) {
		MessageHandler.send({ type: "set-enabled", enabled: enabled });
	}

	async start() {
		MessageHandler.send({ type: "get-channels" }, (response) => {
			if (response.type === "query-channels") {
				ChromeExtension.allowed_channels = response.channels;
			}
		});
	}

	static async generateToggleDiv() {

		const div = document.createElement("div");
		div.id = "wt-toggle";

		ChromeExtension.enabled = await ChromeExtension.getEnabled();

		if (ChromeExtension.enabled) {
			div.innerHTML = `<h2>Enabled</h2>`;
		}
		else {
			div.innerHTML = `<h2>Disabled</h2>`;
		}

		div.onclick = () => {
			ChromeExtension.enabled = !ChromeExtension.enabled;
			ChromeExtension.setEnabled(ChromeExtension.enabled);
			if (ChromeExtension.enabled) {
				div.innerHTML = `<h2>Enabled</h2>`;
			} else {
				div.innerHTML = `<h2>Disabled</h2>`;
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
	}

	async deleteShorts() {
		const _deleteShorts = () => {
			const shorts = document.getElementsByTagName(YoutubeSettings.home.shorts.tag);
			for (let i = 0; i < shorts.length; i++) {
				const short = shorts[i];
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

		if (this.searching) return;
		this.searching = true;

		const _grabVideos = async () => {

			const getContainers = () => {
				if (is_home) {
					return document.getElementsByTagName(YoutubeSettings.home.container);
				} else {
					return document.getElementsByTagName(YoutubeSettings.video.container);
				}
			}

			const is_home = ChromeExtension.page_instance.page === "home";
			let containers = getContainers();

			for (let i = 0; i < containers.length; i++) {
				let videos;
				if (is_home) {
					videos = containers[i].getElementsByTagName(YoutubeSettings.home.yt_video);
				}
				else {
					videos = containers[i].getElementsByTagName(YoutubeSettings.video.yt_video);
					//delete all circles 
					const circles = containers[i].getElementsByTagName(YoutubeSettings.video.yt_circle);
					for (let i = 0; i < circles.length; i++) {
						const circle = circles[i];
						circle.style.display = "none";
					}

				}

				getContainers();

				for (let z = 0; z < videos.length; z++) {
					const video_dom = videos[z];
					const videof_obj = VideoFactory.createVideo(video_dom);
					const _channel = this.channels.addChannel(new Channel(videof_obj.channelname.name, videof_obj.channelname.name));
					if (_channel)
						_channel.addVideo(videof_obj.video);
				}
			}
		}

		ChromeExtension.page_instance.onVideoRefresh = _grabVideos;
	}

	async clearCacheRoutine() {
		while (true) {
			await sleep(() => {
				this.clearCache();
			}, 1000 * 10);

		}
	}

	async disableVideos() {
		let banned_channels = this.channels.channels.filter(channel => !ChromeExtension.allowed_channels.includes(channel.name));
		for (let i = 0; i < banned_channels.length; i++) {
			const channel = banned_channels[i];
			for (let z = 0; z < channel.videos.length; z++) {
				const video = channel.videos[z];
				video.refresh();
				if (video.disabled) continue;
				video.disable();
			}
		}
	}

	startVideoDisableLoop() {
		ChromeExtension.page_instance.onVideoRefresh = this.disableVideos.bind(this);
	}

	clearCache() {
		this.channels.clearCache();
	}

	static addAllowedChannel(channel_name) {
		if (!ChromeExtension.allowed_channels.includes(channel_name)) {
			ChromeExtension.allowed_channels.push(channel_name);
		}
	}

	static removeAllowedChannel(channel_name) {
		if (ChromeExtension.allowed_channels.includes(channel_name)) {
			ChromeExtension.allowed_channels.splice(ChromeExtension.allowed_channels.indexOf(channel_name), 1);
		}
	}

}


//used by the background script
async function inject(...args) {
	const ce = new ChromeExtension([]);
	ChromeExtension.page_instance.onVideoRefresh = () => {
		ce.injectHeader();
	}
	ce.search();
	ce.startVideoDisableLoop();
	ce.deleteShorts();

	//run chrome listener on update, and check the page
	chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
		if (request.type === "update") {
			ce.clearCache();
			ChromeExtension.page_instance.refreshPage(() => {
			});
		}
	});
}

inject();

