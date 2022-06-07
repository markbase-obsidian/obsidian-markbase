import { CreateProjectModal } from "components/createProjectModal";
import { CustomModal } from "components/customModal";
import { DeleteProjectModal } from "components/deleteProjectModal";
import Api from "helpers/api";
import { displayErrorModal } from "helpers/modals";
import { Project } from "helpers/types";
import { zipDirectory } from "helpers/zip";
import {
	App,
	debounce,
	FileSystemAdapter,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { shell } from "electron";

interface MarkbasePluginSettings {
	markbaseUserToken: string;
}

const DEFAULT_SETTINGS: MarkbasePluginSettings = {
	markbaseUserToken: "",
};

export default class MarkbasePlugin extends Plugin {
	settings: MarkbasePluginSettings;
	tokenValid: boolean;
	apiClient: Api;
	projects: Project[] = [];

	async onload() {
		console.info("Loading Markbase Sync for Obsidian plugin");
		await this.loadSettings();
		// This adds a settings tab so the user can configure various aspects of the plugin
		const settingsTab = new MarkbaseSettingTab(this.app, this);
		this.addSettingTab(settingsTab);

		this.apiClient = new Api(this.settings.markbaseUserToken);
		await this.saveSettings();
		app.workspace.onLayoutReady(() => this.initializeProjects(settingsTab));
	}

	async initializeProjects(settingsTab: MarkbaseSettingTab) {
		// Verify token
		await this.verifyToken(settingsTab);
		if (this.tokenValid) {
			// Get projects
			const projects = await this.apiClient.listProjectsForUser();
			if (projects.data.projects) {
				this.projects = projects.data.projects;
			}
		} else {
			new Notice(
				"Markbase Token Invalid - unable to fetch/create projects"
			);
		}
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async refreshProjects() {
		if (this.tokenValid) {
			// Get projects
			const projects = await this.apiClient.listProjectsForUser();
			if (projects.data.projects) {
				this.projects = projects.data.projects;
			}
		} else {
			new Notice(
				"Markbase Token Invalid - unable to fetch/create projects"
			);
		}
	}

	verifyToken = async (settingsTab: MarkbaseSettingTab): Promise<void> => {
		try {
			this.apiClient = this.apiClient.updateClient(
				this.settings.markbaseUserToken
			);
			const verifiedResult = await this.apiClient.verifyObsidianToken();
			this.tokenValid = verifiedResult.data.verified;
		} catch (error) {
			this.tokenValid = false;
		}

		this.saveSettings();

		if (settingsTab.containerEl.querySelector("#settingsContainer")) {
			settingsTab.displaySettings();
		}
	};

	debouncedVerifyToken = debounce(this.verifyToken, 500);
}

export class MarkbaseSettingTab extends PluginSettingTab {
	plugin: MarkbasePlugin;

	constructor(app: App, plugin: MarkbasePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", { text: "Markbase Settings" });

		new Setting(containerEl)
			.setName("Markbase User Token")
			.setDesc(
				"Get your unique token from the dashboard or settings page in Markbase. Before you can use Markbase, this must be valid."
			)
			.addText((text) =>
				text
					.setPlaceholder("XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX")
					.setValue(this.plugin.settings.markbaseUserToken)
					.onChange(async (value) => {
						this.plugin.settings.markbaseUserToken = value;
						this.plugin.debouncedVerifyToken(this);
					})
			);

		containerEl.createDiv({
			attr: {
				id: "settingsContainer",
			},
		});

		this.displaySettings();
	}

	async displaySettings(): Promise<void> {
		const { containerEl } = this;
		const settingsContainer = containerEl.querySelector(
			"#settingsContainer"
		) as HTMLElement;
		settingsContainer.empty();

		if (this.plugin.tokenValid) {
			settingsContainer.createEl("h3", { text: "Your Projects" });
			settingsContainer.createDiv({
				attr: {
					id: "projectsContainer",
				},
			});

			this.loadProjects();

			new Setting(settingsContainer)
				.addButton((button) => {
					button.setButtonText("Manage Projects").onClick((e) => {
						shell.openExternal(
							"https://app.markbase.xyz/dashboard"
						);
					});
				})
				.addButton((button) => {
					button.setButtonText("Refresh").onClick((e) => {
						this.loadProjects();
					});
				})
				.addButton((button) => {
					button.setButtonText("Create Project").onClick((e) => {
						new CreateProjectModal(
							app,
							this.plugin,
							this,
							this.plugin.settings.markbaseUserToken
						).open();
					});
				});
		} else {
			settingsContainer.createEl("p", {
				text: "Invalid token - please enter the right token to list, resync and create projects",
				cls: "markbase-invalid-token-error",
			});
		}
	}

	async loadProjects(): Promise<void> {
		const { containerEl } = this;

		const projectsContainer = containerEl.querySelector(
			"#projectsContainer"
		) as HTMLElement;
		projectsContainer.empty();

		await this.plugin.refreshProjects();
		if (this.plugin.projects.length > 0) {
			projectsContainer.createEl("p", {
				text: "Manage your projects here or from the Markbase app dashboard",
			});

			for (const project of this.plugin.projects) {
				new Setting(projectsContainer)
					.setName(project.name + ` - ${project.folderToShare}`)
					.setDesc(`Live at ${project.publishedUrl}`)
					.addButton((button) => {
						button.setButtonText("🔗 View").onClick((e) => {
							if (project.publishedUrl) {
								shell.openExternal(
									"https://" +
										project.publishedUrl
											.replace("https://", "")
											.trim()
								);
							}
						});
					})
					.addButton((button) =>
						button.setButtonText("🔃 Sync").onClick(async (e) => {
							const loadingModal = new CustomModal(
								app,
								"Syncing...",
								"Please wait for the project to finish syncing. This can take a while for large projects"
							);
							loadingModal.open();

							// Re sync the project - i.e. reupload files and push changes to github
							// Get files and zip them
							let basePath = "";
							if (
								this.app.vault.adapter instanceof
								FileSystemAdapter
							) {
								basePath = this.app.vault.adapter.getBasePath();
							}

							try {
								const zipBuffer = await zipDirectory(
									basePath + "/" + project.folderToShare
								);
								try {
									await this.plugin.apiClient.syncProjectForUser(
										project.slug,
										zipBuffer
									);

									new CustomModal(
										app,
										"Project successfully synced!",
										"Allow a few minutes for changes to go live! You can manage your project in the Markbase dashboard at https://markbase.xyz"
									).open();
									loadingModal.close();
								} catch (error) {
									displayErrorModal(app);
									loadingModal.close();
									console.error(
										"Error occurred while trying to sync project - ",
										error
									);
								}
							} catch (error) {
								displayErrorModal(app);
								console.error(
									"Error occurred while trying to zip files to sync the project - ",
									error
								);
							}
						})
					)
					.addButton((button) => {
						button
							.setButtonText("❌ Delete")
							.setWarning()
							.onClick(async (e) => {
								new DeleteProjectModal(
									app,
									this.plugin,
									this,
									this.plugin.settings.markbaseUserToken,
									project.id
								).open();
							});
					});
			}
		} else {
			projectsContainer.createEl("p", {
				text: "No projects to display. You can create a project using the button below",
			});
		}
	}
}
