import { App, Modal } from "obsidian";

export class ProjectCreatedModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.createEl("h2", { text: "Project successfully created!" });
		contentEl.createEl("p", {
			text: "Please restart Obsidian to see changes. You can manage your project in the Markbase dashboard at https://markbase.xyz",
		});
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
