class Identifiable {
	id = "";
	name = "";

	constructor(id, name) {
		this.id = id;
		this.name = name;
	}

	compare(other) {
		return this.id === other.id;
	}

}

class Channel extends Identifiable {
	videos = [];

	constructor(id, name) {
		super(id, name);
	}

	doesVideoExist(video) {
		if (video instanceof Video) {
			return this.videos.find(v => v.compare(video));
		}
		return false;
	}

	addVideo(video) {
		if (video instanceof Video) {
			const _video = this.doesVideoExist(video);
			if (_video) {
				return _video;
			} else {
				video.inject(this);
				this.videos.push(video);
				return video;
			}
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

	disable() {
		if (this.disabled) return;
		if (!ChromeExtension.enabled)
			this.dom.style.display = "none";

		this.changeInjectionState(true);
		this.disabled = true;
	}

	enable() {
		if (!this.disabled) return;
		if (!ChromeExtension.enabled)
			this.dom.style.display = "block";

		this.changeInjectionState(false);
		this.disabled = false;
	}

	/**
	 * @param {Channel} channel
	 */
	inject(channel) {
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
		this.dom.appendChild(element);
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
				tag: "a",
				id: "title"
			}
		}
	},
	generic: {
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
	page = "home";
	_onVideoRefresh = [];
	_onPageLoad = [];


	constructor() {
		this.getPage().then((page) => {
			this.page = page;
			this.pageLoaded();
		});
	}

	linkCSS(path) {
		const link = document.createElement("link");
		link.href = chrome.runtime.getURL(path);
		link.type = "text/css";
		link.rel = "stylesheet";
		document.getElementsByTagName("head")[0].appendChild(link);
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

	async engine() {
		while (this.page_loaded) {
			this._onVideoRefresh.forEach(async (callback) => {
				callback();
			});
			await sleep(() => { }, 500);
		}
	}

	async pageLoaded() {
		while (!this.isVideoOnPage()) {
			await sleep(() => { }, 25);
		}
		this.page_loaded = true;
		this._onPageLoad.forEach(callback => {
			callback();
		});
		this.engine();
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
	set onVideoRefresh(callback) {
		this._onVideoRefresh.push(callback);
	}

	/**
	 * @param {Function} callback The callback to be called when the page is loaded
	 */
	set onPageLoad(callback) {
		this._onPageLoad.push(callback);
	}

}

class VideoFactroy {
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
}

class ChromeExtension {
	channels = new ChannelCache();
	static allowed_channels = []; //string
	static page_instance = new PageHandler();
	static enabled = false;
	searching = false;
	started = false;

	constructor(allowed_channels) {
		ChromeExtension.allowed_channels = allowed_channels;
		this.start();
	}

	get channels() {
		return this.channel;
	}

	async start() {
		MessageHandler.send({ type: "get-channels" }, (response) => {
			if (response.type === "query-channels") {
				ChromeExtension.allowed_channels = response.channels;
			}
		});
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

	//methods

	/**
	* @description Searches the current page for any video elements adds them into the array 
		 @returns Nothing(void)
	*/
	async search() {

		if (this.searching) return;
		this.searching = true;

		const _grabVideos = async () => {

			const is_home = ChromeExtension.page_instance.page === "home";

			let containers;
			if (is_home)
				containers = document.getElementsByTagName(YoutubeSettings.home.container);
			else
				containers = document.getElementsByTagName(YoutubeSettings.video.container);

			for (let i = 0; i < containers.length; i++) {
				let videos;
				if (is_home)
					videos = containers[i].getElementsByTagName(YoutubeSettings.home.yt_video);
				else
					videos = containers[i].getElementsByTagName(YoutubeSettings.video.yt_video);


				for (let z = 0; z < videos.length; z++) {
					const video_dom = videos[z];
					const videof_obj = VideoFactroy.createVideo(video_dom);
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
		for (let i = 0; i < banned_channels.length; i++) {
			const channel = banned_channels[i];
			for (let z = 0; z < channel.videos.length; z++) {
				if (channel.videos[z].disabled) continue;
				const video = channel.videos[z];
				video.disable();
			}
		}
	}

	startVideoDisableLoop() {
		ChromeExtension.page_instance.onVideoRefresh = this.disableVideos.bind(this);
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
	ce.search();
	ce.startVideoDisableLoop();
	ce.deleteShorts();
}

inject();

