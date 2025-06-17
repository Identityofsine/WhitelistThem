/**
 * Extended HTMLElement interface for channel-related DOM elements
 * Used for elements that contain channel data attributes
 */
export interface HTMLChannelElement extends HTMLElement {
	dataset: {
		channel: string;
	};
} 