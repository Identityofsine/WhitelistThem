class Identifiable {
	id = "";
	name = "";

	constructor(id, name) {
		this.id = id;
		this.name = name;
	}

	compare(other) {
		return this.id === other.id;
	}

}

class Channel extends Identifiable {
	videos = [];

	constructor(id, name) {
		super(id, name);
	}

	addVideo(video) {
		if (video instanceof Video) {
			this.videos.push(video);
		}
	}

	//remove video?
	removeVideo(video) {
		if (video instanceof Video) {
			this.videos = this.videos.filter(v => !v.compare(video));
		}
	}

}

class Video extends Identifiable {
	isShort = false;

	constructor(id, name, isShort) {
		super(id, name);
		this.isShort = isShort;
	}
}



