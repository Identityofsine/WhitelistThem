import { Dispatch } from "interfaces/dispatch";
import { Identifiable } from "object/abstract/identifiable";

type Effect<ObjectType> = Dispatch<ObjectType, Dispatch<void,void>>;

export type FxState<ObjectType> = {
	(): ObjectType | undefined;
	set: (newState: ObjectType) => void;
	effect: Effect<ObjectType>;
};

export class State<ObjectType> {

	private state: ObjectType | undefined;
	private readonly _events: Map<Identifiable, (obj?:ObjectType) => void> = new Map();

	constructor(state?: ObjectType) {
		this.state = state;
	}	

	stateValue(): ObjectType | undefined {
		return this.state;
	}

	setState(newState: ObjectType): void {
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
		return () => {
			this._events.delete(id);
		};
	}

}

export function createState<ObjectType>(initialState?: ObjectType): FxState<ObjectType> {
	const statePrototype = new State<ObjectType>(initialState);

	const fxState = () => statePrototype.stateValue.bind(statePrototype)() as ObjectType | undefined;

	fxState.set = (newState: ObjectType) => {
		statePrototype.setState.bind(statePrototype)(newState);
	};

	fxState.effect = (effect: (newState: ObjectType) => () => void) => {
		const cleanup = () => console.warn("No cleanup function provided");
		return () => {
			cleanup();
		};
	}

	return fxState;
}
