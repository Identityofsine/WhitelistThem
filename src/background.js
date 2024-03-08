// Path: background.js

//storage method: {channels:[channel_names], enabled:bool}
function debugPrint(text) {
	console.log("-".repeat(20));
	console.log(text);
	console.log("-".repeat(20));
}

class Browser {
	static get browser_instance() {
		//check if browser is chrome or firefox	
		if (typeof browser !== 'undefined') {
			return browser;
		}
		if (typeof chrome !== 'undefined') {
			return chrome;
		}
		throw new Error('No browser instance found');
	}
}

class Storage {
	static storage = Browser.browser_instance.storage.sync;

	static async createIfNotExists(key, init_value) {
		return new Promise((resolve, _reject) => {
			this.storage.get(key).then((result) => {
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
			this.storage.get(key).then((result) => {
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

//clean routine
function cleanRoutine() {
	Storage.get("channels").then((result) => {
		if (result.channels === undefined) return;
		let channels = result.channels;
		//filter out null values
		channels = channels.filter((c) => c !== null);
		console.log(channels);
		Storage.set("channels", channels);
	});
}

// browser runtime listener
Storage.createIfNotExists("channels", []);
Storage.createIfNotExists("enabled", true);

async function getChannels() {
	const result = await Storage.get("channels");
	return result;
}

async function getTab(tabIndex) {
	let queryOptions = { active: true, currentWindow: true, index: tabIndex };
	let tabs = await Browser.browser_instance.tabs.query(queryOptions);
	let MAX_ATTEMPTS = 100;
	while (tabs.length === 0 && MAX_ATTEMPTS > 0) {
		tabs = await Browser.browser_instance.tabs.query(queryOptions);
		await new Promise((resolve) => setTimeout(resolve, 50));
		MAX_ATTEMPTS--;
	}
	if (MAX_ATTEMPTS === 0) {
		console.log("Error: Could not get tab...")
		return null;
	}
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
		} else if (path.startsWith('/@')) {
			return 'channel';
		}
	}

	// If the URL doesn't match the expected patterns
	return 'home';
}


//send message to content script to refresh -- called when site is changed or updated
Browser.browser_instance.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
	if (changeInfo.status === "complete") {
		Browser.browser_instance.tabs.sendMessage(tab.id, { type: "update" });
	}
});



//setchannels
Browser.browser_instance.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
	if (request.type === "set-channels") {
		Storage.set("channels", request.channels);
		_sendResponse({ type: "reload-channels", channels: request.channels });
	}
});

//recieve message from content script
Browser.browser_instance.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
	if (request.type === "add-channel") {
		Storage.get("channels").then((result) => {
			let channels = result.channels;
			if (channels.includes(request.channel)) {
				return;
			} else {
				if ((request.channel?.length ?? 0) <= 0) return; //ignore
				debugPrint("Adding Channel: " + request.channel);
				channels.push(request.channel);
				Storage.set("channels", channels);
			}
		});
	}
});

//recieve message from content script
Browser.browser_instance.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
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
Browser.browser_instance.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
	if (request.type === "get-channels") {
		getChannels().then((result) => {
			console.log("Sending channels: ", result.channels);
			_sendResponse({ type: "query-channels", channels: result.channels });
		});
		return true;
	}
});

//return current page (home or video)
Browser.browser_instance.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
	if (request.type === "get-page") {
		//get tab id
		const tabIndex = _sender.tab.index;
		getTab(tabIndex).then((result) => {
			const page = determinePageType(result);
			_sendResponse({ type: "query-page", page: page });
		});
		return true;
	}
});

Browser.browser_instance.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
	if (request.type === "get-enabled") {
		Storage.get("enabled").then((result) => {
			_sendResponse({ type: "query-enabled", enabled: result.enabled });
			console.log("Sending enabled: ", result.enabled);
		});
		return true;
	}
});

Browser.browser_instance.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
	if (request.type === "set-enabled") {
		Storage.set("enabled", request.enabled ?? true);
		console.log("Setting enabled to: ", request.enabled);
		return true;
	}
});


cleanRoutine();
