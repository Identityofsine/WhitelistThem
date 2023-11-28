console.log("Hello from background.js");

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if (changeInfo.status === 'complete' && tab.url.includes('://www.youtube.com/')) {
		chrome.scripting.insertCSS({
			target: { tabId: tabId },
			files: ["styles.css"]
		});
	}
});
