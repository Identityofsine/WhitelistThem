import { ChannelCache } from "../cache/channelcache";
import { YoutubeSettings } from "../constants/settings";
import { VideoFactory } from "../factory/videofactory";
import { ButtonComponent } from "../framework/components/ButtonComponent";
import { SyncPage } from "../framework/components/SyncPage";
import { ToggleComponent } from "../framework/components/ToggleComponent";
import { computed } from "../framework/state/computed";
import { createState, FxState } from "../framework/state/state";
import { MessageHandler } from "../handler/messagehandler";
import { PageHandler } from "../handler/pagehandler";
import { HTMLChannelElement } from "../interfaces/html";
import { Channel } from "../object/channel";
import { log } from "../util/log/log";

/**
 * Main Chrome Extension class that orchestrates all extension functionality
 * Handles video filtering, channel management, UI injection, and state management
 */
export class ChromeExtension {
    channels = new ChannelCache();
    static readonly allowed_channels: FxState<string[]> = createState<string[]>([]);
    static page_instance = new PageHandler();
    static enabled: FxState<boolean> = createState(false);
    searching = false;
    started = false;

    constructor(allowed_channels: string[]) {
        ChromeExtension.allowed_channels.set(allowed_channels);
        ChromeExtension.page_instance.start();
        this.start();
    }

    /**
     * Gets the current page type from the page handler
     */
    static get currentPage() {
        return ChromeExtension.page_instance.page;
    }

    /**
     * Retrieves the enabled state from the background script
     * @returns Promise resolving to boolean enabled state
     */
    static async getEnabled(): Promise<boolean> {
        return new Promise((resolve, _) => {
            MessageHandler.send({ type: "get-enabled" }, (response: any) => {
                resolve(response.enabled);
            });
        });
    }

    /**
     * Sets the enabled state via the background script
     * @param enabled - The new enabled state to set
     */
    static setEnabled(enabled: boolean): void {
        MessageHandler.send({ type: "set-enabled", enabled: enabled });
    }

    /**
     * Initializes the extension by fetching allowed channels
     */
    async start(): Promise<void> {
        MessageHandler.send({ type: "get-channels" }, (response) => {
            if (response.type === "query-channels") {
                ChromeExtension.allowed_channels.set(response.channels);
            }
        });
    }

    /**
     * Generates the sync page component for channel management
     * @returns Promise resolving to SyncPage component
     */
    static async generateSerializerDiv(): Promise<SyncPage> {
        return new SyncPage({
            states: {
                channelList: ChromeExtension.allowed_channels,
            },
        });
    }

    /**
     * Generates the toggle component for enabling/disabling the extension
     * @returns Promise resolving to ToggleComponent
     */
    static async generateToggleDiv(): Promise<ToggleComponent> {
        ChromeExtension.enabled.set(await ChromeExtension.getEnabled());

        const div = new ToggleComponent({
            tag: "enable-disable-component",
            state: ChromeExtension.enabled,
            onClick: () => {
                const value = ChromeExtension.enabled();
                ChromeExtension.enabled.set(!value);
                ChromeExtension.setEnabled(!value);
            },
        });
        div.elementRef.id = YoutubeSettings.generic.header.buttons.inject.id;

        return div;
    }

    /**
     * Injects the toggle and sync components into the YouTube header
     */
    async injectHeader(): Promise<void> {
        const header = document.getElementsByTagName(
            YoutubeSettings.generic.header.container.tag,
        )[0];
        if (!header) return;

        const buttons_container = header.querySelector(
            "#" + YoutubeSettings.generic.header.buttons.id,
        );
        const injection_spot: HTMLElement | null = header.querySelector(
            "#" + YoutubeSettings.generic.header.buttons.inject.id,
        );

        if (!buttons_container || !injection_spot) return;

        const injection_check = injection_spot.querySelectorAll("enable-disable-component");
        if (injection_check.length > 0) {
            if (injection_check.length >= 2) {
                console.warn(
                    "[channel] Too many Header Injections, deleting all but one",
                );
                for (let i = 1; i < injection_check.length; i++) {
                    injection_check[i]?.remove();
                }
            }
            if (!injection_check[0]) return;
            return;
        }

        if (injection_check.length <= 0) {
            const toggle_div = await ChromeExtension.generateToggleDiv();
            injection_spot.appendChild(toggle_div.elementRef);
        }

        if (injection_spot) {
            await this.injectSeralizerButton(injection_spot);
        }
    }

    /**
     * Injects the serializer button component
     * @param injection_spot - The DOM element where to inject the button
     */
    async injectSeralizerButton(injection_spot: HTMLElement): Promise<void> {
        const injection_check = injection_spot.querySelector("sync-page");
        if (injection_check) return;

        const serializer_div = await ChromeExtension.generateSerializerDiv();
        injection_spot.appendChild(serializer_div.elementRef);
    }

    /**
     * Extracts the channel name from the current channel page
     * @returns Promise resolving to channel name or undefined
     */
    async getChannelNameFromChannelPage(): Promise<string | undefined> {
        if (ChromeExtension.page_instance.page !== "channel") {
            return;
        }

        const channel_container = document.getElementsByTagName(
            YoutubeSettings.channel.channel.container,
        )[0];
        if (!channel_container) {
            console.log("[channel] No channel container");
            return;
        }

        const channel_tag = channel_container.querySelector(
            YoutubeSettings.channel.channel.tag,
        ) as HTMLElement;
        if (!channel_tag) {
            console.log("[channel] No channel tag");
            return;
        }

        const channel_name = channel_tag.innerText;
        return channel_name;
    }

    /**
     * Refreshes the allowed channels list from the background script
     */
    static async refreshChannels(): Promise<void> {
        ChromeExtension.allowed_channels.set([]);
        MessageHandler.send({ type: "get-channels" }, (response) => {
            if (response.type === "query-channels") {
                console.log("[serializer] Refreshing channels");
                ChromeExtension.allowed_channels.set(response.channels);
            }
        });
    }

    /**
     * Updates the channel injection UI based on whitelist status
     * @param div - The HTML element to update
     * @param channel_name - The name of the channel
     */
    async refreshChannelInjection(div: HTMLChannelElement, channel_name: string): Promise<void> {
        if (!div) {
            return;
        }

        if (!div.dataset) {
            div.dataset = { channel: channel_name };
        }

        if (div.dataset?.channel !== channel_name) {
            console.warn(
                "[channel] Channel name mismatch (expected: %s, got: %s)",
                div.dataset?.channel,
                channel_name,
            );
            div.dataset.channel = channel_name;
        }

        if (ChromeExtension.allowed_channels()?.includes(channel_name)) {
            div.innerHTML = `<h2>Blacklist Channel</h2>`;
        } else {
            div.innerHTML = `<h2>Whitelist Channel</h2>`;
        }
    }

    /**
     * Injects the whitelist/blacklist button on channel pages
     */
    async injectChannel(): Promise<void> {
        if (ChromeExtension.page_instance.page !== "channel") return;

        const injection_check = document.querySelectorAll("#wt-add");
        const channel_name = (await this.getChannelNameFromChannelPage()) ?? "";

        if (injection_check.length > 0) {
            if (injection_check.length >= 2) {
                console.warn(
                    "[channel] Too many Channel Injections, deleting all but one",
                );
                for (let i = 1; i < injection_check.length; i++) {
                    injection_check[i]?.remove();
                }
            }
            if (!injection_check[0]) return;
            return;
        }

        const container = await PageHandler.WaitForElement(() =>
            document.querySelector(YoutubeSettings.channel.inject.container.tag),
        );
        const injection_spot: HTMLElement = container.querySelector(
            YoutubeSettings.channel.inject.injection_spot.tag,
        );

        if (!injection_spot) {
            console.log("[channel] No injection spot");
            return;
        }

        injection_spot.style.cssText = `${injection_spot.style.cssText} ${YoutubeSettings.channel.inject.injection_spot.inject_styles}`;

        if (!channel_name) {
            return;
        }

        const component = new ButtonComponent({
            labelSignal: computed(() => `${ChromeExtension?.allowed_channels?.()?.includes(channel_name) ? 'Blacklist' : 'Whitelist'}`),
            onClick(_) {
                const isWhitelisted = ChromeExtension?.allowed_channels?.()?.includes(channel_name);
                log.debug("[channel] Button clicked for channel: %s - (whitelisted:%s)", channel_name, isWhitelisted);
                if (!isWhitelisted) {
                    MessageHandler.addChannel(channel_name);
                    ChromeExtension.addAllowedChannel(channel_name, () => { });
                } else {
                    MessageHandler.removeChannel(channel_name);
                    ChromeExtension.removeAllowedChannel(channel_name, () => { });
                }
            },
        })

        component.elementRef.id = YoutubeSettings.channel.inject.injection_spot.inject_id;
        injection_spot.appendChild(component.elementRef);
    }

    /**
     * Hides YouTube Shorts from the page
     */
    async deleteShorts(): Promise<void> {
        console.log("[inject] Deleting Shorts...");
        const _deleteShorts = () => {
            const shorts = document.getElementsByTagName(
                YoutubeSettings.home.shorts.tag,
            );
            for (let i = 0; i < shorts.length; i++) {
                const short = shorts[i] as HTMLElement;
                short.style.display = "none";
            }
        };
        ChromeExtension.page_instance.onVideoRefresh = _deleteShorts;
    }

    /**
     * Searches the current page for video elements and adds them to the cache
     * Handles different page types (home, channel, video)
     */
    async search(): Promise<void> {
        console.log("[inject] Starting Search Routine...");
        if (this.searching) return;
        this.searching = true;

        const _grabVideos = async () => {
            const getContainers = () => {
                switch (ChromeExtension.currentPage) {
                    case "channel":
                    case "home":
                        return document.getElementsByTagName(
                            YoutubeSettings.home.container,
                        );
                    case "video":
                        return document.getElementsByTagName(
                            YoutubeSettings.video.container,
                        );
                    default:
                        return document.getElementsByTagName(
                            YoutubeSettings.home.container,
                        );
                }
            };

            let containers = getContainers();
            for (let i = 0; i < containers.length; i++) {
                const container = containers[i];
                if (!container) continue;

                let videos;
                switch (ChromeExtension.currentPage) {
                    case "channel":
                    case "home":
                        videos = container.getElementsByTagName(
                            YoutubeSettings.home.yt_video,
                        );
                        break;
                    case "video":
                        videos = container.getElementsByTagName(
                            YoutubeSettings.video.yt_video,
                        );
                        const circles = container.getElementsByTagName(
                            YoutubeSettings.video.yt_circle,
                        );
                        for (let i = 0; i < circles.length; i++) {
                            const circle = circles[i] as HTMLElement;
                            circle.style.opacity = "0";
                        }
                        break;
                    default:
                        return;
                }
                for (let z = 0; z < videos.length; z++) {
                    const video_dom = videos[z] as HTMLElement;
                    const videof_obj = VideoFactory.createVideo(video_dom);
                    if (!videof_obj) {
                        log.info("[inject] No video found in container %s", containers[i]);
                        continue;
                    }
                    const _channel = this.channels.addChannel(
                        new Channel(
                            videof_obj.channelname.name,
                            videof_obj.channelname.name,
                        ),
                    );
                    if (_channel) _channel.addVideo(videof_obj.video);
                }
            }
        };

        ChromeExtension.page_instance.onVideoRefresh = _grabVideos;
    }

    /**
     * Disables videos from channels not in the whitelist
     */
    async disableVideos(): Promise<void> {
        let banned_channels = this.channels.channels.filter(
            (channel) => !ChromeExtension.allowed_channels()?.includes(channel.name),
        );
        banned_channels.forEach(async (channel) => {
            if (channel.disabledState === false) {
                console.log(`[inject] Disabling channel: ${channel.name}`);
                channel.disable();
            }
        });
    }

    /**
     * Enables videos from channels in the whitelist
     */
    async enableVideos(): Promise<void> {
        let allowed_channels = this.channels.channels.filter((channel) =>
            ChromeExtension.allowed_channels()?.includes(channel.name),
        );
        allowed_channels.forEach((channel) => channel.enable());
    }

    /**
     * Starts the main video filtering loop
     * Sets up reactive updates when the channel list changes
     */
    startVideoDisableLoop(): void {
        console.log("[inject] Starting Video Disable Routine...");
        ChromeExtension.page_instance.onVideoRefresh = async () => {
            this.disableVideos.bind(this)();
        };
        ChromeExtension.allowed_channels.effect(() => {
            this.disableVideos.bind(this)();
            this.enableVideos.bind(this)();
        });
    }

    /**
     * Clears the channel cache
     */
    clearCache(): void {
        this.channels.clearCache();
    }

    /**
     * Refreshes the channel cache (placeholder for future implementation)
     */
    refreshCache(): void { }

    /**
     * Adds a channel to the allowed list
     * @param channel_name - Name of the channel to add
     * @param callback - Optional callback function
     */
    static addAllowedChannel(channel_name: string, callback?: () => void): void {
        if (!ChromeExtension.allowed_channels()?.includes(channel_name)) {
            ChromeExtension.allowed_channels?.set([
                ...(ChromeExtension.allowed_channels() ?? []),
                channel_name,
            ]);
            MessageHandler.addChannel(channel_name, callback);
        }
    }

    /**
     * Removes a channel from the allowed list
     * @param channel_name - Name of the channel to remove
     * @param callback - Optional callback function
     */
    static removeAllowedChannel(channel_name: string, callback?: () => void): void {
        if (ChromeExtension.allowed_channels()?.includes(channel_name)) {
            ChromeExtension.allowed_channels.set(
                ChromeExtension.allowed_channels()?.filter(
                    (name) => name !== channel_name,
                ) ?? [],
            );

            MessageHandler.removeChannel(channel_name, callback);
        }
    }
} 