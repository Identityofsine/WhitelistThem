import { Identifiable } from "./abstract/identifiable";
import { Video } from "./video";

export class Channel extends Identifiable {
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


