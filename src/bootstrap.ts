import { ChromeExtension } from "./core/extension";
import { Browser } from "./interfaces/browser";
import "./styles/styles.scss";
import "./styles/tagger.scss";

/**
 * Main injection function that initializes the Chrome Extension
 * Called by the background script to start the extension on YouTube pages
 * 
 * @param _ - Unused parameters from background script
 * @returns Promise resolving to true when injection is complete
 */
async function inject(..._: any[]): Promise<boolean> {
    const ce = new ChromeExtension([]);

    console.log("[injector] Injecting...");

    // Set up the main refresh handler for UI injections
    ChromeExtension.page_instance.onVideoRefresh = () => {
        ce.injectHeader();
        ce.injectChannel();
        ce.channels.channels.forEach((channel) => {
            channel.refresh();
        });
    };

    // Initialize core extension functionality
    ce.search();
    ce.startVideoDisableLoop();
    ce.deleteShorts();

    // Listen for messages from the background script
    //@ts-ignore
    Browser.browser.runtime.onMessage.addListener(
        (request: any, _sender: any, _sendResponse: any) => {
            if (request.type === "update") {
                // Handle page navigation updates
                ChromeExtension.page_instance.refreshPage((page, updated) => {
                    if (page === "channel" && updated) {
                        ChromeExtension.page_instance.WaitUntilHeaderLoaded(() => {
                            ce.injectChannel();
                            ce.injectHeader();
                        });
                    }
                });
                ce.clearCache();
            } else if (request.type === "update-channels") {
                // Handle channel list updates
                console.log("[injector] Updating Channels");
                ce.refreshCache();
            }
        },
    );

    return true;
}

// Start the injection process
inject(); 