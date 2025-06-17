import { createState, FxState, LinkedSignal, startTracking, stopTrackingWithCleanup } from "./state";

/**
 * A computed signal that derives its value from other signals
 * Computed signals are read-only and automatically update when their dependencies change
 * 
 * @template T The type of the computed value
 */
export type Computed<T> = Omit<FxState<T>, 'set'> & {
	/** Get the current computed value */
	(): T | undefined;
}

/**
 * Creates a computed signal that automatically updates when its dependencies change
 * The computation function is re-executed whenever any accessed signal changes
 * 
 * @template T The type of value returned by the computation
 * @param computation Function that derives a value from other signals
 * @returns A read-only computed signal
 * 
 * @throws {Error} If attempting to call `.set()` on the returned computed signal
 * 
 * @example
 * ```typescript
 * const firstName = createState('John');
 * const lastName = createState('Doe');
 * 
 * const fullName = computed(() => `${firstName()} ${lastName()}`);
 * console.log(fullName()); // "John Doe"
 * 
 * firstName.set('Jane');
 * console.log(fullName()); // "Jane Doe" - automatically updated
 * 
 * // Always cleanup computed values to prevent memory leaks
 * fullName.cleanUp();
 * ```
 */
export function computed<T>(computation: () => T): Computed<T> {
	// Create underlying state to store the computed value
	const localState = createState<T | undefined>(undefined);
	const localSet = localState.set.bind(localState);

	// Store cleanup functions for proper memory management
	let dependencyCleanups: (() => void)[] = [];

	// Override the set method to prevent direct modification
	localState.set = () => {
		throw new Error("Computed signals cannot be set directly. They are derived from other signals.");
	};

	const computed: Computed<T> = localState as Computed<T>;

	// Initialize the computation and set up dependency tracking with cleanup
	dependencyCleanups = handleComputationWithCleanup(computation, localSet);

	// Override cleanup to include dependency cleanup
	const originalCleanup = computed.cleanUp;
	computed.cleanUp = () => {
		// Clean up all dependency subscriptions first
		dependencyCleanups.forEach(cleanup => {
			try {
				cleanup();
			} catch (error) {
				console.error('Error cleaning up computed dependency:', error);
			}
		});
		dependencyCleanups = [];

		// Then cleanup the underlying state
		originalCleanup();
	};

	return computed;
}

/**
 * Creates a linked signal that maintains a connection to its computation
 * Similar to computed but allows for more flexible state management patterns
 * 
 * @template T The type of value returned by the computation
 * @param computation Function that derives a value from other signals
 * @returns A linked signal that can be both read and written
 * 
 * @example
 * ```typescript
 * const baseValue = createState(10);
 * const multiplier = createState(2);
 * 
 * const result = linkedSignal(() => baseValue() * multiplier());
 * console.log(result()); // 20
 * 
 * // Unlike computed, linkedSignal retains the ability to be set directly
 * result.set(100);
 * console.log(result()); // 100
 * 
 * // Always cleanup when done to prevent memory leaks
 * result.cleanUp();
 * ```
 */
export function linkedSignal<T>(computation: () => T): LinkedSignal<T> {
	// Create underlying state to store the linked value
	const localState = createState<T | undefined>(undefined);
	const localSet = localState.set.bind(localState);

	// Store cleanup functions for proper memory management
	let dependencyCleanups: (() => void)[] = [];

	// Initialize the computation and set up dependency tracking with cleanup
	dependencyCleanups = handleComputationWithCleanup(() => computation(), localSet);

	// Override cleanup to include dependency cleanup
	const originalCleanup = localState.cleanUp;
	localState.cleanUp = () => {
		// Clean up all dependency subscriptions first
		dependencyCleanups.forEach(cleanup => {
			try {
				cleanup();
			} catch (error) {
				console.error('Error cleaning up linked signal dependency:', error);
			}
		});
		dependencyCleanups = [];

		// Then cleanup the underlying state
		originalCleanup();
	};

	return localState as LinkedSignal<T>;
}

/**
 * Enhanced computation handler with proper cleanup tracking and memory leak prevention
 * This function orchestrates the tracking of signal dependencies and sets up reactivity
 * 
 * @template T The type of value returned by the computation
 * @param computation Function to execute and track dependencies for
 * @param set Function to update the computed/linked signal's value
 * @returns Array of cleanup functions for dependency management
 * 
 * @private
 */
function handleComputationWithCleanup<T>(computation: () => T, set: (value: T) => void): (() => void)[] {
	// Begin dependency tracking
	startTracking();

	// Execute the computation to get initial value and collect dependencies
	const initialValue = computation();
	set(initialValue);

	// Stop tracking and register effects on all accessed signals with cleanup tracking
	const cleanupFunctions = stopTrackingWithCleanup((signal) => {
		try {
			// Re-run computation whenever any dependency changes
			const newValue = computation();
			set(newValue);
		} catch (error) {
			console.error('Error during computed value recalculation:', error);
		}
	});

	return cleanupFunctions;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use handleComputationWithCleanup instead for better memory management
 * @private
 */
function handleComputation<T>(computation: () => T, set: (value: T) => void): void {
	handleComputationWithCleanup(computation, set);
}
