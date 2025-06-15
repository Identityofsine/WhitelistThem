import { Dispatch } from "./dispatch";

export interface HTMLActions {
	onClick(listener: Dispatch<Partial<MouseEvent>>): void;
	onFocus(listener: Dispatch<Partial<FocusEvent>>): void;
	onBlur(listener: Dispatch<Partial<FocusEvent>>): void;
	onMouseOver(listener: Dispatch<Partial<MouseEvent>>): void;
	onMouseOut(listener: Dispatch<Partial<MouseEvent>>): void;
}
