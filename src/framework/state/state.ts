import { Dispatch } from "interfaces/dispatch";
import { Identifiable } from "object/abstract/identifiable";
import { Computed } from "./computed";

export type Signal<ObjectType> = FxState<ObjectType> | Computed<ObjectType>;

type Effect<ObjectType> = Dispatch<Dispatch<ObjectType, void>, Dispatch<void, void>>;

export type FxState<ObjectType> = {
	(): ObjectType | undefined;
	set: (newState: ObjectType) => void;
	effect: Effect<ObjectType>;
};

// global tracking for all signals
let currentTrackingIndex: Set<FxState<any>> | null = null;

export function startTracking(fn: (signal: FxState<any>) => void): void {
	currentTrackingIndex = new Set();
	currentTrackingIndex.forEach((signal) => {
		fn(signal);
	});
}

export function stopTracking(): void {
	if (!currentTrackingIndex) return;
	currentTrackingIndex = null;
}

export class State<ObjectType> {

	private state: ObjectType | undefined;
	private readonly _events: Map<Identifiable, (obj?: ObjectType) => void> = new Map();

	constructor(state?: ObjectType) {
		this.state = state;
	}

	stateValue(): ObjectType | undefined {
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

	//add to itself
	fxState.effect(() => {
		if (currentTrackingIndex) {
			currentTrackingIndex.add(fxState);
		}
	})

	return fxState;
}
