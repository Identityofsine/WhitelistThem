import { Dispatch } from "../framework/tagger";

export async function sleep(callback: Dispatch, timeout: number) {
	return new Promise((resolve, _reject) => {
		setTimeout(() => {
			resolve(callback());
		}, timeout);
	});
}
