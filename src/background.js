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

async function getTab() {
	let queryOptions = { active: true, currentWindow: true };
	let tabs = await chrome.tabs.query(queryOptions);
	return tabs[0].url;
}

function determinePageType(url) {
	const urlObject = new URL(url);

	if (urlObject.hostname === 'www.youtube.com') {
		const path = urlObject.pathname.toLowerCase();

		if (path === '/' || path === '/results' || path === '/feed/trending') {
			return 'home';
		} else if (path.startsWith('/watch')) {
			return 'video';
		}
	}

	// If the URL doesn't match the expected patterns
	return 'unknown';
}

//recieve message from content script
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
	if (request.type === "add-channel") {
		Storage.get("channels").then((result) => {
			let channels = result.channels;
			if (channels.includes(request.channel)) {
				return;
			} else {
				debugPrint("Adding Channel: " + request.channel);
				channels.push(request.channel);
				Storage.set("channels", channels);
			}
		});
	}
});

//recieve message from content script
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
	if (request.type === "remove-channel") {
		Storage.get("channels").then((result) => {
			let channels = result.channels;
			if (channels.includes(request.channel)) {
				debugPrint("Remove Channel: " + request.channel);
				channels = channels.filter((c) => c !== request.channel);
				Storage.set("channels", channels);
			} else {
			}
		});
	}
});

//recieve message from channels 
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
	if (request.type === "get-channels") {
		getChannels().then((result) => {
			console.log("Sending channels: ", result.channels);
			_sendResponse({ type: "query-channels", channels: result.channels });
		});
		return true;
	}
});

//return current page (home or video)
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
	if (request.type === "get-page") {
		getTab().then((result) => {
			const page = determinePageType(result);
			console.log("Sending page:", page);
			_sendResponse({ type: "query-page", page: page });
		});
		return true;
	}
});



