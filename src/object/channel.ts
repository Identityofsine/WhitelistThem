import { createState, FxState } from "framework/state/state";
import { Identifiable } from "./abstract/identifiable";
import { Video } from "./video";
import { MessageHandler } from "handler/messagehandler";
import { ChromeExtension } from "index";

export class Channel extends Identifiable {
	videos: Video[] = [];

	private disabled: FxState<boolean> = createState(false);
	private disableDisplayState = createState(this.disabledState ?? false);

	constructor(id: string, name: string) {
		super(id, name);
		this.disabled.effect(async (state) => {
			console.log(
				`Channel ${this.name} is now ${state ? "disabled" : "enabled"}.`,
			);
			this.disableDisplayState.set(state);
		});
		this.disableDisplayState.effect((state) => {
			if (!state) {
				MessageHandler.addChannel(this.name);
				ChromeExtension.addAllowedChannel(this.name, () => { });
			} else {
				MessageHandler.removeChannel(this.name);
				ChromeExtension.removeAllowedChannel(this.name, () => { });
			}
		});
	}

	doesVideoExist(video: Video) {
		if (video instanceof Video) {
			const first_search = this.videos.find((v) => v.compare(video));
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

			video.inject(this.disableDisplayState);

			this.videos.push(video);
			return video;
		} else return false;
	}

	//remove video?
	removeVideo(video: Video) {
		if (video instanceof Video) {
			this.videos = this.videos.filter((v) => !v.compare(video));
		}
	}

	enable() {
		this.disabled.set(false);
	}

	disable() {
		this.disabled.set(true);
	}

	refresh() {
		this.videos.forEach((video) => video.refresh());
	}

	get disabledState(): boolean | undefined {
		return this.disabled();
	}
}
