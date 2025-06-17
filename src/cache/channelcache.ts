import { Channel } from "../object/channel";

/**
 * Manages caching and lifecycle of channel objects
 * Handles adding, removing, and bulk operations on channels
 */
export class ChannelCache {
    channels: Channel[] = [];

    constructor() { }

    /**
     * Checks if a channel already exists in the cache
     * @param channel - The channel to check for existence
     * @returns The existing channel if found, false otherwise
     */
    doesChannelExist(channel: Channel): Channel | false {
        if (channel instanceof Channel) {
            return this.channels.find((c) => c.compare(channel)) || false;
        }
        return false;
    }

    /**
     * Adds a new channel to the cache or returns existing one
     * @param channel - The channel to add
     * @returns The channel (new or existing)
     */
    addChannel(channel: Channel): Channel | undefined {
        if (channel instanceof Channel) {
            const existingChannel = this.doesChannelExist(channel);
            if (!existingChannel) {
                channel.inject();
                this.channels.push(channel);
                return channel;
            } else {
                channel.cleanUp();
                return existingChannel;
            }
        }
        return undefined;
    }

    /**
     * Disables all videos across all cached channels
     */
    disableVideos(): void {
        this.channels.forEach((channel) => {
            channel.disable();
        });
    }

    /**
     * Enables all videos across all cached channels
     */
    enableVideos(): void {
        this.channels.forEach((channel) => {
            channel.enable();
        });
    }

    /**
     * Clears the entire channel cache
     */
    clearCache(): void {
        this.channels = [];
    }
} 