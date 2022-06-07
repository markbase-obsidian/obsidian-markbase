import Api from "helpers/api";
import { displayErrorModal } from "helpers/modals";
import { zipDirectory } from "helpers/zip";
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
	slugError: boolean;

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
					this.checkIfOkayToSubmit();
				})
			);

		new Setting(contentEl)
			.setName("Slug")
			.setDesc(
				"A unique easy-to-read identifier for your website (e.g. tomsblog) - must be lowercase, between 5-50 characters, contain only letters, hyphens or numbers, and no hyphens at the start or end"
			)
			.addText((text) =>
				text.setValue("").onChange((value) => {
					let { contentEl } = this;
					const slugErrorEl = contentEl.querySelector(
						"#markbase-project-slug-error"
					);
					if (
						value.toLowerCase() !== value ||
						value.startsWith("-") ||
						value.endsWith("-") ||
						value.length > 50 ||
						value.length < 5 ||
						!/^[a-z0-9-]*$/.test(value)
					) {
						this.slugError = true;
						slugErrorEl.textContent = "Please enter a valid slug";
					} else {
						this.slugError = false;
						slugErrorEl.textContent = "";
					}
					this.slug = value;
					this.checkIfOkayToSubmit();
				})
			);

		contentEl.createEl("p", {
			text: "",
			attr: {
				id: "markbase-project-slug-error",
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
						this.checkIfOkayToSubmit();
					});
			});

		new Setting(contentEl).addButton((button) => {
			button
				.setButtonText("Create")
				.onClick((e) => {
					this.submitNewProject();
				})
				.setDisabled(true);

			button.setClass("createProjectButton");
		});
	}

	checkIfOkayToSubmit() {
		let { contentEl } = this;
		const createProjectButton = contentEl.querySelector(
			".createProjectButton"
		);

		if (this.slugError || !this.folderToShare || !this.name || !this.slug) {
			createProjectButton.setAttr("disabled", this.slugError);
		} else {
			createProjectButton.removeAttribute("disabled");
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
			// Slug is in use - display warning message
			new CustomModal(
				app,
				"That slug's already in use",
				"Please try again with a different slug"
			).open();
			loadingModal.close();
		} else {
			// Get files and zip them
			let basePath = "";
			if (this.app.vault.adapter instanceof FileSystemAdapter) {
				basePath = this.app.vault.adapter.getBasePath();
			}

			try {
				const zipBuffer = await zipDirectory(
					basePath + "/" + this.folderToShare
				);

				try {
					await this.plugin.apiClient.createProjectForUser(
						this.slug,
						this.name,
						this.folderToShare,
						zipBuffer
					);

					await this.settings.loadProjects();
					new CustomModal(
						app,
						"Project successfully created!",
						`It can take a few minutes to go live. When ready, you can check it out at ${
							"https://" + this.slug + ".markbase.xyz"
						}. You can manage your project in the Markbase dashboard at https://markbase.xyz`
					).open();
					loadingModal.close();
					this.close();
				} catch (error) {
					displayErrorModal(app);
					loadingModal.close();
					this.close();
					console.error(
						"Error occurred while trying to create new project - ",
						error
					);
				}
			} catch (error) {
				displayErrorModal(app);
				console.error(
					"Error occurred while trying to zip files for the project - ",
					error
				);
			}
		}
	}
}
