import Api from "helpers/api";
import MarkbasePlugin from "main";
import { App, FileSystemAdapter, Modal, Setting } from "obsidian";
import { FolderSuggest } from "settings/suggesters/FolderSuggester";
import { CustomModal } from "./customModal";

export class CreateProjectModal extends Modal {
	markbaseUserToken: string;
	plugin: MarkbasePlugin;
	name: string;
	slug: string;
	folderToShare: string;

	constructor(app: App, plugin: MarkbasePlugin, markbaseUserToken: string) {
		super(app);
		this.markbaseUserToken = markbaseUserToken;
		this.plugin = plugin;
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.createEl("h2", { text: "Create a new Markbase project" });
		contentEl.createEl("p", {
			text: "Ensure your project's deepest file/path isn't too long. A good way to test this is to see if you can copy your chosen folder manually without any errors",
		});

		new Setting(contentEl).setName("Project Name").addText((text) =>
			text.setValue("").onChange(async (value) => {
				this.name = value;
			})
		);

		new Setting(contentEl)
			.setName("Slug")
			.setDesc(
				"A unique easy-to-read identifier for your website (e.g. tomsblog)"
			)
			.addText((text) =>
				text.setValue("").onChange(async (value) => {
					this.slug = value;
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
		const loadingModal = new CustomModal(
			app,
			"Loading...",
			"Please wait for the project to finish being created. This can take a while for larger projects"
		);
		loadingModal.open();
		const slugUsed = await new Api(this.markbaseUserToken).getProjectBySlug(
			this.slug
		);

		if (slugUsed.data.project) {
			loadingModal.close();
			// Slug is in use - display warning message
			new CustomModal(
				app,
				"That slug's already in use",
				"Please try again with a different slug"
			).open();
		} else {
			// Get files and zip them
			let basePath = "";
			if (this.app.vault.adapter instanceof FileSystemAdapter) {
				basePath = this.app.vault.adapter.getBasePath();
			}
			const zipper = require("zip-local");

			// zipping a file
			zipper.zip(
				basePath + "/" + this.folderToShare,
				async (error: any, zipped: any) => {
					if (!error) {
						// zipped.compress(); // compress before exporting
						var buff = zipped.memory(); // get zipped file as Buffer

						try {
							await this.plugin.apiClient.createProjectForUser(
								this.slug,
								this.name,
								this.folderToShare,
								buff
							);
							loadingModal.close();
							this.close();

							new CustomModal(
								app,
								"Project successfully created!",
								"You can manage your project in the Markbase dashboard at https://markbase.xyz"
							).open();

							this.plugin.unload();
							this.plugin.load();
						} catch (error) {
							loadingModal.close();
							this.close();

							new CustomModal(
								app,
								"An error occurred",
								"Please contact support on https://markbase.xyz. You can find more information in Obsidian's console by pressing Ctrl+Shift+I"
							);
							console.error(
								"Error occurred while trying to create new project - ",
								error
							);
						}
					} else {
						new CustomModal(
							app,
							"An error occurred",
							"Please contact support on https://markbase.xyz. You can find more information in Obsidian's console by pressing Ctrl+Shift+I"
						);
						console.error(
							"Error occurred while trying to zip files for the project - ",
							error
						);
					}
				}
			);
		}
	}
}
