import Api from "helpers/api";
import MarkbasePlugin from "main";
import { App, FileSystemAdapter, Modal, Setting } from "obsidian";
import { FolderSuggest } from "settings/suggesters/FolderSuggester";
import { CustomModal } from "./customModal";

export class DeleteProjectModal extends Modal {
	markbaseUserToken: string;
	plugin: MarkbasePlugin;
	projectId: string;

	constructor(
		app: App,
		plugin: MarkbasePlugin,
		markbaseUserToken: string,
		projectId: string
	) {
		super(app);
		this.markbaseUserToken = markbaseUserToken;
		this.plugin = plugin;
		this.projectId = projectId;
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.createEl("h2", {
			text: "Are you sure you want to delete this project?",
		});
		contentEl.createEl("p", {
			text: "Deleting is permanent. You won't be able to recover your project after it's deleted.",
		});

		new Setting(contentEl)
			.addButton((button) => {
				button
					.setButtonText("Delete")
					.setWarning()
					.onClick((e) => {
						this.deleteProject();
					});
			})
			.addButton((button) => {
				button.setButtonText("Cancel").onClick((e) => {
					this.close();
				});
			});
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}

	async deleteProject() {
		// Check if slug hasn't been used already and if it has then display warning and disable create button
		const loadingModal = new CustomModal(
			app,
			"Loading...",
			"Please wait for the project to finish being deleted. This can take a while for larger projects"
		);
		loadingModal.open();
		try {
			await new Api(this.markbaseUserToken).deleteProjectById(
				this.projectId
			);
			loadingModal.close();
			this.close();
			this.plugin.unload();
			this.plugin.load();
		} catch (error) {
			loadingModal.close();
			this.close();
			new CustomModal(
				app,
				"An error occurred",
				"Please try again or contact Markbase Support in the Markbase app"
			).open();
		}
	}
}
