import { App, Modal } from "obsidian";

export class SlugInUseModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.createEl("h2", { text: "That slug's already in use" });
		contentEl.createEl("p", {
			text: "Please try again with a different slug",
		});
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
