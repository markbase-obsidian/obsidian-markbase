import Api from "helpers/api";
import MarkbasePlugin, { MarkbaseSettingTab } from "main";
import { App, Modal, Setting } from "obsidian";
import { CustomModal } from "./customModal";

export class DeleteProjectModal extends Modal {
	markbaseUserToken: string;
	plugin: MarkbasePlugin;
	settings: MarkbaseSettingTab;
	projectId: string;

	constructor(
		app: App,
		plugin: MarkbasePlugin,
		settings: MarkbaseSettingTab,
		markbaseUserToken: string,
		projectId: string
	) {
		super(app);
		this.markbaseUserToken = markbaseUserToken;
		this.plugin = plugin;
		this.settings = settings;
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
			this.settings.loadProjects().then(() => {
				this.close();
			});
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
