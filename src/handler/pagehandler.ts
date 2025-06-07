import { Dispatch } from "framework/tagger";
import { ChromeExtension } from "..";
import { SleepSettings, YoutubeSettings } from "../constants/settings";
import { TimeoutError } from "../error/timeout";
import { EngineInstance } from "../interfaces/engine";
import { Pages } from "../interfaces/pages";
import { sleep } from "../util/sleep";
import { Identifiable } from "object/abstract/identifiable";
import { Browser } from "interfaces/browser";

export class PageHandler {
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
		let video: HTMLCollectionOf<Element>;
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

			await PageHandler.WaitForElement(() => header_container.querySelector("#" + YoutubeSettings.generic.header.buttons.id));

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
			//@ts-ignore
			Browser.browser.runtime.sendMessage({ type: "get-page" }, (response) => {
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


