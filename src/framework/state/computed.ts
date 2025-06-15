import { FxState, startTracking } from "./state";

export type Computed<T> = Omit<FxState<T>, 'set'> & {
	(): T | undefined;
}

export function computed<T>(computation: () => T): Computed<T> {


	startTracking((signal) => {
		console.log("Tracking signal:", signal);
	})
	const t = computation();
	stopTracking();

	return t;

}

