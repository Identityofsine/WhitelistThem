import { createState, FxState } from "framework/state/state";
import { Identifiable } from "./abstract/identifiable";
import { Video } from "./video";
import { MessageHandler } from "handler/messagehandler";
import { ChromeExtension } from "index";
import { Disposable } from "interfaces/disposable";
import { log } from "util/log/log";

export class Channel extends Identifiable implements Disposable {
	videos: Video[] = [];

	private disabled?: FxState<boolean>;
	private disableDisplayState?: FxState<boolean>;

	constructor(id: string, name: string) {
		super(id, name);

	}

	inject() {
		this.disabled = createState(this.disabledState ?? false);
		this.disableDisplayState = createState(this.disabledState ?? false);
		this.disabled.effect(async (state) => {
			log.debug(`Channel ${this.name} is now ${state ? "disabled" : "enabled"}.`);
			this.disableDisplayState!.set(state);
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

	cleanUp(): void {
		this.disabled?.cleanUp();
		this.disableDisplayState?.cleanUp();
		this.videos.forEach((video) => video.cleanUp());
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

			if (this.disableDisplayState) {
				video.inject(this.disableDisplayState);
			} else {
				//TODO: throw error?
				return false;
			}

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
		this.disabled?.set(false);
	}

	disable() {
		this.disabled?.set(true);
	}

	refresh() {
		this.videos.forEach((video) => video.refresh());
	}

	get disabledState(): boolean | undefined {
		return this.disabled?.();
	}
}
