//@ts-nocheck
//static table
export type ChromeMessage = {
	type: string;
	channel?: string;
	channels?: string[];
	enabled?: boolean;
}


export class Browser {
	public static get isFirefox() {
		return navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
	}
	public static get browser(): any | undefined {
		//@ts-ignore
		if (chrome) {
			return chrome;
		} else {
			return browser;
		}
	}
}
