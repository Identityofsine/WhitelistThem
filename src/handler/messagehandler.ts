import { Dispatch } from "../framework/tagger";
import { Browser, ChromeMessage } from "../interfaces/browser";

//communicate with service workers
export class MessageHandler {
	static send(message: ChromeMessage, callback?: Dispatch) {
		Browser.browser.runtime.sendMessage(message, (response: any) => {
			var lastError = Browser.browser.runtime.lastError;
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
		Browser.browser.runtime.onMessage.addListener(() => callback());
	}

}
