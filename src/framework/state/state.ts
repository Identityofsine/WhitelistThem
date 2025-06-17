import { Dispatch } from "interfaces/dispatch";
import { Identifiable } from "object/abstract/identifiable";
import { Computed } from "./computed";
import { Disposable } from "interfaces/disposable";

// Type declarations for environment-specific APIs
declare global {
	interface FinalizationRegistry<T> {
		register(target: object, heldValue: T, unregisterToken?: object): void;
		unregister(unregisterToken: object): boolean;
	}

	var FinalizationRegistry: {
		prototype: FinalizationRegistry<unknown>;
		new <T>(cleanupCallback: (heldValue: T) => void): FinalizationRegistry<T>;
	};

	var process: {
		on(event: string, listener: (...args: unknown[]) => void): void;
	} | undefined;
}

/**
 * A signal that can either be a reactive state or a computed value
 * @template ObjectType The type of data stored in the signal
 */
export type Signal<ObjectType> = FxState<ObjectType> | Computed<ObjectType>;

/**
 * A signal that maintains a direct link to the underlying state
 * @template ObjectType The type of data stored in the signal
 */
export type LinkedSignal<ObjectType> = FxState<ObjectType>;

/**
 * An effect function that receives both the new state value and a cleanup function
 * @template ObjectType The type of data being observed
 */
type Effect<ObjectType> = Dispatch<Dispatch<ObjectType, void>, Dispatch<void, void>>;

/**
 * A reactive state container that can be read, written, and observed for changes
 * @template ObjectType The type of data stored in the state
 */
export type FxState<ObjectType> = {
	/** Get the current state value */
	(): ObjectType | undefined;
	/** Update the state with a new value */
	set: (newState: ObjectType) => void;
	/** Register an effect to run when the state changes */
	effect: Effect<ObjectType>;
	/** Check if this state has been disposed */
	isDisposed: () => boolean;
} & Disposable;

// Global tracking mechanism using WeakSet to allow garbage collection
let currentTrackingIndex: WeakSet<Signal<any>> | null = null;

// Global cleanup registry to track all active states and ensure cleanup
const globalStateRegistry = new Set<State<any>>();

// FinalizationRegistry to detect when states are garbage collected without proper cleanup
const finalizationRegistry = typeof FinalizationRegistry !== 'undefined'
	? new FinalizationRegistry((heldValue: string) => {
		console.warn(`State ${heldValue} was garbage collected without explicit cleanup. This may indicate a memory leak.`);
	})
	: null;

// Auto-cleanup when page/context is destroyed
let isGlobalCleanupRegistered = false;

/**
 * Registers global cleanup handlers to prevent memory leaks on page unload
 * @private
 */
function registerGlobalCleanup(): void {
	if (isGlobalCleanupRegistered) return;
	isGlobalCleanupRegistered = true;

	// Cleanup on page unload (browser environment)
	if (typeof window !== 'undefined') {
		window.addEventListener('beforeunload', () => {
			cleanupAllStates();
		});
	}

	// Cleanup on process exit (Node.js environment)
	if (typeof process !== 'undefined' && process?.on) {
		process.on('exit', () => {
			cleanupAllStates();
		});
	}
}

/**
 * Cleans up all registered states to prevent memory leaks
 * @public
 */
export function cleanupAllStates(): void {
	const states = Array.from(globalStateRegistry);
	for (const state of states) {
		try {
			state.cleanUp();
		} catch (error) {
			console.error('Error during state cleanup:', error);
		}
	}
	globalStateRegistry.clear();
}

/**
 * Begins tracking signal dependencies for computed values
 * Uses WeakSet to allow garbage collection of tracked signals
 * 
 * @throws {Warning} If tracking is already active, logs a warning about potential merge
 */
export function startTracking(): void {
	if (currentTrackingIndex) {
		console.warn("Tracking is already started. This will cause a merge of tracking indices.");
		return;
	}
	currentTrackingIndex = new WeakSet();
}

/**
 * Stops tracking and registers effects for all tracked signals
 * This should be called after evaluating a computed function
 * 
 * @param _fn Callback function to execute for each tracked signal (currently unused)
 */
export function stopTracking(_fn: (signal: Signal<any>) => void): void {
	if (!currentTrackingIndex) return;

	// Convert WeakSet to temporary Set for iteration
	// Note: We can't iterate over WeakSet directly, so we'll need to change the approach
	currentTrackingIndex = null;
}

// Store tracking dependencies during computation for proper cleanup
let trackingDependencies: Signal<any>[] = [];

/**
 * Enhanced tracking that maintains cleanup references
 * @param fn Callback function to execute for each tracked signal
 */
export function stopTrackingWithCleanup(fn: (signal: Signal<any>) => void): (() => void)[] {
	const cleanupFunctions: (() => void)[] = [];

	for (const signal of trackingDependencies) {
		if (signal.effect) {
			const cleanup = signal.effect(() => {
				fn(signal);
			});
			cleanupFunctions.push(cleanup);
		} else {
			fn(signal);
		}
	}

	trackingDependencies = [];
	currentTrackingIndex = null;

	return cleanupFunctions;
}

/**
 * Core reactive state implementation with enhanced memory leak prevention
 * Manages state storage, change notifications, and effect cleanup
 * 
 * @template ObjectType The type of data stored in this state
 */
export class State<ObjectType> implements Disposable {
	private state: ObjectType | undefined;
	private readonly _events: Map<Identifiable, (obj?: ObjectType) => void> = new Map();
	private _isDisposed: boolean = false;
	private readonly _id: string;
	private readonly _cleanupFunctions: Set<() => void> = new Set();

	/**
	 * Creates a new reactive state instance
	 * @param state Initial state value (optional)
	 */
	constructor(state?: ObjectType) {
		this.state = state;
		this._id = `state_${Identifiable.generateUUID()}`;

		// Register for global cleanup
		globalStateRegistry.add(this);
		registerGlobalCleanup();

		// Register with FinalizationRegistry to detect improper cleanup
		if (finalizationRegistry) {
			finalizationRegistry.register(this, this._id);
		}
	}

	/**
	 * Gets the current state value and registers for dependency tracking
	 * This method automatically adds itself to the current tracking context
	 * 
	 * @returns The current state value or undefined
	 * @throws {Error} If the state has been disposed
	 */
	stateValue(): ObjectType | undefined {
		if (this._isDisposed) {
			throw new Error(`Attempted to access disposed state ${this._id}`);
		}

		// Register this state for dependency tracking in computed values
		if (currentTrackingIndex) {
			trackingDependencies.push(this as Signal<ObjectType>);
		}
		return this.state;
	}

	/**
	 * Updates the state value and notifies all registered effects
	 * Uses both strict (===) and loose (==) equality checks for optimization
	 * 
	 * @param newState The new state value to set
	 * @throws {Error} If the state has been disposed
	 */
	async setState(newState: ObjectType): Promise<void> {
		if (this._isDisposed) {
			throw new Error(`Attempted to set disposed state ${this._id}`);
		}

		// Skip update if value hasn't changed (both strict and loose equality)
		if (this.state === newState || this.state == newState) return;

		this.state = newState;

		// Notify all registered effects of the state change
		this._events.forEach((callback, id) => {
			try {
				callback(newState);
			} catch (error) {
				console.error(`Error in effect ${id}:`, error);
				// Remove problematic effect to prevent further errors
				this._events.delete(id);
			}
		});
	}

	/**
	 * Removes an effect callback from the events map
	 * 
	 * @param id Unique identifier for the effect to remove
	 * @private
	 */
	private deleteEvent(id: Identifiable): void {
		if (this._events.has(id)) {
			this._events.delete(id);
		} else {
			console.warn(`Event with id ${id} does not exist in state ${this._id}.`);
		}
	}

	/**
	 * Registers an effect function to run when the state changes
	 * 
	 * @param effect Function to execute when state changes
	 * @returns Cleanup function to remove this effect
	 * @throws {Error} If the state has been disposed
	 */
	effect(effect: Dispatch<ObjectType, void>): Dispatch<void, void> {
		if (this._isDisposed) {
			throw new Error(`Attempted to add effect to disposed state ${this._id}`);
		}

		const id = Identifiable.generateIdentifiable(`effect_func.${this._events.size}`);

		this._events.set(id, (newState?: ObjectType) => {
			if (newState !== undefined) {
				effect(newState);
			}
		});

		// Create cleanup function and track it
		const cleanup = this.deleteEvent.bind(this, id);
		this._cleanupFunctions.add(cleanup);

		// Return enhanced cleanup function that also removes from tracking
		return () => {
			cleanup();
			this._cleanupFunctions.delete(cleanup);
		};
	}

	/**
	 * Checks if this state instance has been disposed
	 * @returns True if disposed, false otherwise
	 */
	isDisposed(): boolean {
		return this._isDisposed;
	}

	/**
	 * Cleans up all resources associated with this state
	 * Removes all effects, clears the state value, and marks as disposed
	 */
	cleanUp(): void {
		if (this._isDisposed) return;

		// Mark as disposed first to prevent new operations
		this._isDisposed = true;

		// Clean up all tracked cleanup functions
		this._cleanupFunctions.forEach(cleanup => {
			try {
				cleanup();
			} catch (error) {
				console.error('Error during cleanup function execution:', error);
			}
		});
		this._cleanupFunctions.clear();

		// Clear all registered effects
		this._events.clear();

		// Clear state reference to allow garbage collection
		this.state = undefined;

		// Remove from global registry
		globalStateRegistry.delete(this);
	}
}

/**
 * Factory function to create a reactive state with a functional API and enhanced memory safety
 * This provides a more convenient interface than using the State class directly
 * 
 * @template ObjectType The type of data to store in the state
 * @param initialState The initial value for the state
 * @returns A functional reactive state object with get, set, effect, and cleanup methods
 * 
 * @example
 * ```typescript
 * const count = createState(0);
 * console.log(count()); // 0
 * count.set(5);
 * console.log(count()); // 5
 * 
 * const cleanup = count.effect((newValue) => {
 *   console.log('Count changed to:', newValue);
 * });
 * 
 * // Always cleanup when done to prevent memory leaks
 * cleanup();
 * count.cleanUp();
 * ```
 */
export function createState<ObjectType>(initialState: ObjectType): FxState<ObjectType> {
	const statePrototype = new State<ObjectType>(initialState);

	// Create the getter function that also handles dependency tracking
	const fxState = () => statePrototype.stateValue.bind(statePrototype)() as ObjectType | undefined;

	// Bind the setter method with disposal check
	fxState.set = (newState: ObjectType) => {
		statePrototype.setState.bind(statePrototype)(newState);
	};

	// Bind the effect registration method
	fxState.effect = statePrototype.effect.bind(statePrototype) as Effect<ObjectType>;

	// Bind the cleanup method
	fxState.cleanUp = statePrototype.cleanUp.bind(statePrototype) as () => void;

	// Bind the disposal check method
	fxState.isDisposed = statePrototype.isDisposed.bind(statePrototype) as () => boolean;

	return fxState;
}
