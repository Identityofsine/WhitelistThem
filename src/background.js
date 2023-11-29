// Path: background.js

//storage method: {channels:[channel_names], enabled:bool}
function debugPrint(text) {
	console.log("-".repeat(20));
	console.log(text);
	console.log("-".repeat(20));
}

class Storage {
	static storage = chrome.storage.sync;

	static async createIfNotExists(key, init_value) {
		return new Promise((resolve, _reject) => {
			this.storage.get(key, (result) => {
				if (result[key] === undefined) {
					this.storage.set({ [key]: init_value }, () => { });
					resolve(true);
				} else {
					resolve(false);
				}
			});
		});
	}

	static async get(key) {
		return new Promise((resolve, _reject) => {
			this.storage.get(key, (result) => {
				resolve(result);
			});
		});
	}

	static async set(key, value) {
		return new Promise((resolve, _reject) => {
			this.storage.set({ [key]: value }, () => {
				resolve();
			});
		});
	}

	static async delete(key) {
		return new Promise((resolve, _reject) => {
			this.storage.remove(key, () => {
				resolve();
			});
		});
	}
}

// chrome runtime listener
Storage.createIfNotExists("channels", []);
Storage.createIfNotExists("enabled", true);

async function getChannels() {
	const result = await Storage.get("channels");
	return result;
}

//recieve message from content script
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
	if (request.type === "add-channel") {
		Storage.get("channels").then((result) => {
			let channels = result.channels;
			if (channels.includes(request.channel)) {
				return;
			} else {
				debugPrint("Adding channel: " + request.channel);
				channels.push(request.channel);
				Storage.set("channels", channels);
			}
		});
	} else if (request.type === "get-channels") {
		getChannels().then((result) => {
			console.log("Sending channels: ", result.channels);
			_sendResponse({ type: "query-channels", channels: result.channels });
		});
		return true;
	}
});

