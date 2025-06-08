import { Dispatch } from "./dispatch";

export interface HTMLActions {
	onClick(listener: Dispatch<Partial<MouseEvent>>): void;
	onMouseOver(listener: Dispatch<Partial<MouseEvent>>): void;
	onMouseOut(listener: Dispatch<Partial<MouseEvent>>): void;
}
