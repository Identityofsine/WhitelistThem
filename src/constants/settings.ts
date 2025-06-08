export const SleepSettings = {
	waiting: 250,
	engine: 50,
	max_attempts: 50,
};

export const YoutubeSettings = {
	home: {
		container: "ytd-rich-grid-renderer",
		yt_video: "ytd-rich-item-renderer",
		yt_video_title: {
			tag: "a",
			id: "video-title-link",
		},
		shorts: {
			tag: "ytd-rich-section-renderer",
			class: "style-scope ytd-rich-grid-renderer",
		},
	},
	video: {
		container: "ytd-watch-next-secondary-results-renderer",
		yt_video: "ytd-compact-video-renderer",
		yt_circle: "ytd-continuation-item-renderer",
		yt_video_link: {
			tag: "a",
			class: "yt-simple-endpoint style-scope ytd-compact-video-renderer",
		},
		yt_video_title: {
			tag: "span",
			id: "video-title",
		},
		channel: {
			container: "ytd-channel-name",
			tag: "yt-formatted-string",
			id: "channel-name",
			link: {
				container: "dismissible",
				tag: "a",
				class: "yt-simple-endpoint style-scope ytd-compact-video-renderer",
			},
		},
	},
	channel: {
		channel: {
			container: "ytd-channel-name",
			tag: "yt-formatted-string",
		},
		inject: {
			container: {
				tag: "div",
				id: "inner-header-container",
			},
			injection_spot: {
				tag: "div",
				id: "buttons",
				inject_id: "wt-add",
			},
		},
	},
	generic: {
		header: {
			container: {
				tag: "ytd-masthead",
				id: "masthead",
			},
			buttons: {
				tag: "div",
				id: "end",
				inject: {
					id: "buttons",
				},
			},
		},
		yt_video: {
			channel: {
				tag: "ytd-channel-name",
				id: { tag: "a" },
			},
			title: {
				tag: "a",
				id: "video-title-link",
			},
		},
	},
};
