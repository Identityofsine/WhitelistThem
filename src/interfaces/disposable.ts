
/**
 * Interface for disposable resources.
 * This interface defines a method for cleaning up resources, 
 * especially useful for components that need to release resources when they are no longer needed.
 *
 * (i.e) state
 */
export interface Disposable {
	cleanUp(): void;
}
