import { Dispatch } from "interfaces/dispatch";
import { Identifiable } from "object/abstract/identifiable";
import { Computed } from "./computed";

export type Signal<ObjectType> = FxState<ObjectType> | Computed<ObjectType>;
export type LinkedSignal<ObjectType> = FxState<ObjectType>;

type Effect<ObjectType> = Dispatch<Dispatch<ObjectType, void>, Dispatch<void, void>>;

export type FxState<ObjectType> = {
	(): ObjectType | undefined;
	set: (newState: ObjectType) => void;
	effect: Effect<ObjectType>;
};

// global tracking for all signals
let currentTrackingIndex: Set<Signal<any>> | null = null;

export function startTracking(): void {
	if (currentTrackingIndex) {
		console.warn("Tracking is already started. This will cause a merge of tracking indices.");
		return;
	}
	currentTrackingIndex = new Set();
}

export function stopTracking(fn: (signal: Signal<any>) => void): void {
	if (!currentTrackingIndex) return;
	for (const signal of currentTrackingIndex) {
		if (signal.effect) {
			signal.effect(() => {
				fn(signal);
			});
		} else {
			fn(signal);
		}
	}
	currentTrackingIndex = null;
}

export class State<ObjectType> {

	private state: ObjectType | undefined;
	private readonly _events: Map<Identifiable, (obj?: ObjectType) => void> = new Map();

	constructor(state?: ObjectType) {
		this.state = state;
	}

	stateValue(): ObjectType | undefined {
		//add to itself
		if (currentTrackingIndex) {
			currentTrackingIndex.add(this as Signal<ObjectType>);
		}
		return this.state;
	}

	async setState(newState: ObjectType) {
		if (this.state === newState || this.state == newState) return;
		this.state = newState;
		this._events.forEach((callback) => callback(newState));
	}

	private deleteEvent(id: Identifiable): void {
		if (this._events.has(id)) {
			this._events.delete(id);
		} else {
			console.warn(`Event with id ${id} does not exist.`);
		}
	}

	effect(effect: Dispatch<ObjectType, void>): Dispatch<void, void> {
		const id = Identifiable.generateIdentifiable(`effect_func.${this._events.size}`);
		this._events.set(id, (newState?: ObjectType) => {
			if (newState !== undefined) {
				effect(newState);
			}
		});
		return this.deleteEvent.bind(this, id);
	}

}

export function createState<ObjectType>(initialState: ObjectType): FxState<ObjectType> {
	const statePrototype = new State<ObjectType>(initialState);

	const fxState = () => statePrototype.stateValue.bind(statePrototype)() as ObjectType | undefined;

	fxState.set = (newState: ObjectType) => {
		statePrototype.setState.bind(statePrototype)(newState);
	};

	fxState.effect = statePrototype.effect.bind(statePrototype) as Effect<ObjectType>;

	return fxState;
}
