import Api from "helpers/api";
import MarkbasePlugin, { MarkbaseSettingTab } from "main";
import { App, FileSystemAdapter, Modal, Setting } from "obsidian";
import { FolderSuggest } from "settings/suggesters/FolderSuggester";
import { CustomModal } from "./customModal";

export class CreateProjectModal extends Modal {
	markbaseUserToken: string;
	plugin: MarkbasePlugin;
	settings: MarkbaseSettingTab;
	name: string;
	slug: string;
	folderToShare: string;

	constructor(
		app: App,
		plugin: MarkbasePlugin,
		settings: MarkbaseSettingTab,
		markbaseUserToken: string
	) {
		super(app);
		this.markbaseUserToken = markbaseUserToken;
		this.plugin = plugin;
		this.settings = settings;
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.createEl("h2", { text: "Create a new Markbase project" });

		new Setting(contentEl)
			.setName("Project Name")
			.setDesc("The name you want to display publicly on your site")
			.addText((text) =>
				text.setValue("").onChange(async (value) => {
					this.name = value;
				})
			);

		new Setting(contentEl)
			.setName("Slug")
			.setDesc(
				"A unique easy-to-read identifier for your website (e.g. tomsblog) - must be lowercase, between 5-50 characters, contain only letters, hyphens or numbers, and no hyphens at the start or end"
			)
			.addText((text) =>
				text.setValue("").onChange(async (value) => {
					if (
						value.toLowerCase() !== value ||
						value.startsWith("-") ||
						value.endsWith("-") ||
						value.length > 50 ||
						value.length < 5 ||
						!/^[a-z0-9-]*$/.test(value)
					) {
						this.toggleSlugError(true);
					} else {
						this.toggleSlugError(false);
					}
					this.slug = value;
				})
			);

		contentEl.createEl("p", {
			text: "",
			attr: {
				id: "slug-error",
			},
		});

		new Setting(contentEl)
			.setName("Folder to share/upload")
			.setDesc(
				"Choose the file/folder to upload online. Note that all files and folders inside your chosen directory will be made publicly available online. Ensure the deepest file/path isn't too long. A good way to test this is to see if you can copy your chosen folder manually without any errors"
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

			button.setClass("createProjectButton");
		});
	}

	toggleSlugError(slugError: boolean) {
		let { contentEl } = this;
		const slugErrorEl = contentEl.querySelector("#slug-error");
		const createProjectButton = contentEl.querySelector(
			".createProjectButton"
		);

		if (slugError) {
			slugErrorEl.textContent = "Please enter a valid slug";
			createProjectButton.toggleAttribute("disabled");
		} else {
			slugErrorEl.textContent = "";
			createProjectButton.toggleAttribute("disabled");
		}
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
						zipped.compress(); // compress before exporting
						var buff = zipped.memory(); // get zipped file as Buffer

						try {
							await this.plugin.apiClient.createProjectForUser(
								this.slug,
								this.name,
								this.folderToShare,
								buff
							);
							loadingModal.close();
							this.settings.loadProjects().then(() => {
								this.close();

								new CustomModal(
									app,
									"Project successfully created!",
									`It can take a few minutes to go live. When ready, you can check it out at ${
										"https://" + this.slug + ".markbase.xyz"
									}. You can manage your project in the Markbase dashboard at https://markbase.xyz`
								).open();
							});
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
