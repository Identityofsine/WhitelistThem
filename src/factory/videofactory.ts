import { ChromeExtension } from "..";
import { YoutubeSettings } from "../constants/settings";
import { Video } from "../object/video";

export class VideoFactory {
	static createVideo(video_dom: HTMLElement) {

		function extractVideoId(url: string) {
			var match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
			return match && match[1];
		}

		function getTitleAndID() {
			const is_home = ChromeExtension.page_instance.page === "home";
			let anchor_tags: HTMLCollectionOf<Element>;
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

			let channel_tag: HTMLCollectionOf<Element>;
			if (is_home) {
				channel_tag = video_dom.getElementsByTagName(YoutubeSettings.generic.yt_video.channel.tag);
			} else {
				channel_tag = video_dom.getElementsByTagName(YoutubeSettings.video.channel.tag);
			}
			for (let i = 0; i < channel_tag.length; i++) {
				let search: HTMLAnchorElement | { innerText: string, href: string } | null = null;
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
