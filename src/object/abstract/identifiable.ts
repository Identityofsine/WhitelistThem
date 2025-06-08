export class Identifiable {
	uuid = "";
	id = "";
	name = "";

	constructor(id: string, name: string) {
		this.uuid = Identifiable.generateUUID();
		this.id = id;
		this.name = name;
	}

	static generateUUID() {
		const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
			/[xy]/g,
			function(c) {
				return (
					c === "x"
						? (Math.random() * 16) | 0
						: (((Math.random() * 16) | 0) & 0x3) | 0x8
				).toString(16);
			},
		);
		return uuid;
	}

	static generateIdentifiable(name: string) {
		const id = Identifiable.generateUUID();
		return new Identifiable(id, name);
	}

	compare(other: Identifiable) {
		return this.id === other.id;
	}

	compareUUID(other: Identifiable) {
		return this.uuid === other.uuid;
	}
}
