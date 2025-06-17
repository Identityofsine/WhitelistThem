// Re-export main classes and utilities for external use
export { ChannelCache } from "./cache/channelcache";
export { ChromeExtension } from "./core/extension";
export type { HTMLChannelElement } from "./interfaces/html";
export { Serializer } from "./util/serializer";

// Import and run the bootstrap process
import "./bootstrap";
