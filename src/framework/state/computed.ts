import { createState, FxState, LinkedSignal, Signal, startTracking, stopTracking } from "./state";

export type Computed<T> = Omit<FxState<T>, 'set'> & {
	(): T | undefined;
}

export function computed<T>(computation: () => T): Computed<T> {

	const localState = createState<T | undefined>(undefined);
	const localSet = localState.set.bind(localState);
	localState.set = () => { throw new Error("Computed signals cannot be set directly. They are derived from other signals.") };

	const computed: Computed<T> = localState as Computed<T>;

	handleComputation(computation, localSet);

	return computed;
}

export function linkedSignal<T>(computation: () => T): LinkedSignal<T> {

	const localState = createState<T | undefined>(undefined);
	const localSet = localState.set.bind(localState);

	handleComputation(() => computation(), localSet);

	return localState as LinkedSignal<T>;
}

function handleComputation<T>(computation: () => T, set: (T) => void) {

	startTracking();
	const t = computation();
	set(t);

	stopTracking(
		(signal) => {
			set(computation());
		}
	);
}
