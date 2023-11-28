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

	addVideo(video) {
		if (video instanceof Video) {
			this.videos.push(video);
		}
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

	constructor(id, name, isShort, dom) {
		super(id, name);
		this.isShort = isShort;
		this.dom = dom;
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


//check if page is still loading

class PageHandler {
	init = false;
	page_loaded = false;
	_onVideoRefresh = [];
	_onPageLoad = [];


	constructor() {
		this.pageLoaded();
	}

	isPageLoading() {
		return !this.page_loaded;
	}

	isVideoOnPage() {
		//check where we are
		const video = document.getElementsByTagName(YoutubeSettings.home.yt_video);
		return video.length > 0;
	}

	async engine() {
		while (this.page_loaded) {
			this._onVideoRefresh.forEach(callback => {
				callback();
			});
			await sleep(() => { }, 200);
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
			const anchor_tags = video_dom.getElementsByTagName(YoutubeSettings.home.yt_video_title.tag);
			for (let i = 0; i < anchor_tags.length; i++) {
				const anchor = anchor_tags[i];
				if (anchor.id === YoutubeSettings.home.yt_video_title.id) {
					return { title: anchor.innerText, id: extractVideoId(anchor.href) };
				}
			}
			return { title: '', id: '' };
		}

		function getChannelName() {
			const channel_tag = video_dom.getElementsByTagName(YoutubeSettings.generic.yt_video.channel.tag);
			for (let i = 0; i < channel_tag.length; i++) {
				const search = channel_tag[i].getElementsByTagName(YoutubeSettings.generic.yt_video.channel.id.tag)[0];
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
	allowed_channels = []; //string
	static page_instance = new PageHandler();

	constructor(allowed_channels) {
		this.allowed_channels = allowed_channels;
	}

	get channels() {
		return this.channel;
	}

	get allowed_channels() {
		return this.allowed_channels;
	}


	//methods

	/**
	* @description Searches the current page for any video elements adds them into the array 
	* @returns Nothing(void)
	*/
	async search() {


		const _grabVideos = () => {
			const containers = document.getElementsByTagName(YoutubeSettings.home.container);
			for (let i = 0; i < containers.length; i++) {
				const videos = containers[i].getElementsByTagName(YoutubeSettings.home.yt_video);
				for (let z = 0; z < videos.length; z++) {
					const video_dom = videos[z];
					const videof_obj = VideoFactroy.createVideo(video_dom);
					const _channel = this.channels.addChannel(new Channel(videof_obj.channelname.name, videof_obj.channelname.name));
					if (_channel)
						_channel.addVideo(videof_obj.video);
				}
			}
			console.log(this.channels.channels);
		}

		ChromeExtension.page_instance.onVideoRefresh = _grabVideos;

	}

}


new ChromeExtension("").search();



