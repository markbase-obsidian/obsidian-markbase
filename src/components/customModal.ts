import { App, Modal } from "obsidian";

export class CustomModal extends Modal {
	heading: string;
	description: string;

	constructor(app: App, heading: string, description: string) {
		super(app);
		this.heading = heading;
		this.description = description;
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.createEl("h2", { text: this.heading });
		contentEl.createEl("p", {
			text: this.description,
		});
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
