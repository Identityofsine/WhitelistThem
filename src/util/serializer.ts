/**
 * Handles serialization and deserialization of channel data
 * Used for importing/exporting channel lists to/from JSON format
 */
export class Serializer {
	/**
	 * Imports channels from JSON string format
	 * @param channels - JSON string containing array of channel names
	 * @returns Array of channel names or undefined if parsing fails
	 */
	static importChannels(channels: string): string[] | undefined {
		try {
			const json_parsed = JSON.parse(channels) as string[];
			if (Array.isArray(json_parsed)) {
				return json_parsed;
			}
			throw new Error(`Invalid JSON : (${channels})`);
		} catch (e) {
			console.error("[serializer::import] Error: %s (obj: %s)", e, channels);
			return undefined;
		}
	}

	/**
	 * Exports channels to JSON string format
	 * @param channels - Array of channel names to serialize
	 * @returns JSON string or undefined if serialization fails
	 */
	static exportChannels(channels: string[]): string | undefined {
		try {
			const json_channels = JSON.stringify(channels);
			return json_channels;
		} catch (e) {
			console.error("[serializer::export] Error: %s", e);
			return undefined;
		}
	}
} 