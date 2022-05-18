import Api from "helpers/api";
import MarkbasePlugin from "main";
import { App, Modal, Setting } from "obsidian";
import { FolderSuggest } from "settings/suggesters/FolderSuggester";
import { ProjectCreatedModal } from "./projectCreatedModal";
import { SlugInUseModal } from "./slugInUseModal";

export class CreateProjectModal extends Modal {
	markbaseUserToken: string;
	plugin: MarkbasePlugin;
	name: string;
	slug: string;
	public: boolean;
	folderToShare: string;

	constructor(app: App, plugin: MarkbasePlugin, markbaseUserToken: string) {
		super(app);
		this.markbaseUserToken = markbaseUserToken;
		this.plugin = plugin;
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.createEl("h2", { text: "Create a new Markbase project" });

		new Setting(contentEl).setName("Project Name").addText((text) =>
			text.setValue("").onChange(async (value) => {
				this.name = value;
			})
		);

		new Setting(contentEl)
			.setName("Slug")
			.setDesc(
				"A unique easy-to-read identifier for your website (e.g. harrysblog)"
			)
			.addText((text) =>
				text.setValue("").onChange(async (value) => {
					this.slug = value;
				})
			);

		new Setting(contentEl).setName("Public?").addToggle((toggle) =>
			toggle.setValue(false).onChange(async (value) => {
				this.public = value;
			})
		);

		new Setting(contentEl)
			.setName("Folder to share/upload")
			.setDesc(
				"Choose the file/folder to upload online. Note that all files and folders inside your chosen directory will be made publicly available online."
			)
			.addSearch((search) => {
				new FolderSuggest(this.app, search.inputEl);
				search
					.setPlaceholder("Example: folder1/folder2")
					.setValue(this.folderToShare)
					.onChange((newFolder) => {
						this.folderToShare = newFolder;
					});
			});

		new Setting(contentEl).addButton((button) => {
			button.setButtonText("Create").onClick((e) => {
				this.submitNewProject();
			});
		});
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}

	async submitNewProject() {
		// Check if slug hasn't been used already and if it has then display warning and disable create button
		const slugUsed = await new Api(this.markbaseUserToken).getProjectBySlug(
			this.slug
		);

		if (slugUsed.data.project) {
			// Slug is in use - display warning message
			new SlugInUseModal(app).open();
		} else {
			console.log("NEW PROJECT SUBMITTED WITH FOLLOWING DATA -", {
				markbaseUserToken: this.markbaseUserToken,
				name: this.name,
				slug: this.slug,
				public: this.public,
				folderToShare: this.folderToShare,
			});
			const filesList = await this.app.vault.adapter.list(
				this.folderToShare
			);

			console.log(
				"this.app.vault.adapter.getResourcePath(filesList.files[0])",
				this.app.vault.adapter.getResourcePath(filesList.files[0])
			);

			console.log("filesList", filesList);
			console.log("filesList.files", filesList.files);
			console.log("filesList.folders", filesList.folders);

			try {
				await this.plugin.apiClient.createProjectForUser(
					this.slug,
					this.name,
					this.folderToShare,
					this.public
				);

				new ProjectCreatedModal(app).open();
			} catch (error) {
				console.error(
					"Error occurred while trying to create new project - ",
					error
				);
			}
		}
	}
}
