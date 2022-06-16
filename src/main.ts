import { CreateProjectModal } from "components/createProjectModal";
import { CustomModal } from "components/customModal";
import { DeleteProjectModal } from "components/deleteProjectModal";
import { shell } from "electron";
import Api from "helpers/api";
import { displayErrorModal } from "helpers/modals";
import { SyncManager } from "helpers/sync";
import { Project } from "helpers/types";
import {
	App,
	debounce,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

interface MarkbasePluginSettings {
	markbaseUserToken: string;
	autoSync: boolean;
}

const DEFAULT_SETTINGS: MarkbasePluginSettings = {
	markbaseUserToken: "",
	autoSync: false,
};

export default class MarkbasePlugin extends Plugin {
	settings: MarkbasePluginSettings;
	mounted: boolean = false;
	tokenValid: boolean;
	userSubscribed: boolean;
	apiClient: Api;
	projects: Project[] = [];
	syncManager: SyncManager;

	async onload() {
		console.info("Loading Markbase Sync for Obsidian plugin");
		await this.loadSettings();
		// This adds a settings tab so the user can configure various aspects of the plugin
		const settingsTab = new MarkbaseSettingTab(this.app, this);
		this.addSettingTab(settingsTab);

		// This creates an icon in the left ribbon.
		this.addRibbonIcon(
			"up-and-down-arrows",
			"Sync all Markbase projects",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				this.syncManager.syncAllMarkbaseProjects();
			}
		);

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "sync-all-markbase-projects-command",
			name: "Sync all Markbase projects",
			callback: () => {
				this.syncManager.syncAllMarkbaseProjects();
			},
		});

		this.apiClient = new Api(this.settings.markbaseUserToken);
		await this.saveSettings();
		app.workspace.onLayoutReady(() => this.initializeProjects(settingsTab));
	}

	async initializeProjects(settingsTab: MarkbaseSettingTab) {
		if (!this.mounted) {
			try {
				this.syncManager = new SyncManager(
					this.app,
					this,
					this.settings.autoSync
				);
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
				this.mounted = true;
			} catch (error) {
				this.mounted = true;
			}
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
			try {
				this.userSubscribed = verifiedResult.data.subscribed;
			} catch (error) {
				this.userSubscribed = false;
			}
		} catch (error) {
			this.tokenValid = false;
			this.userSubscribed = false;
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

			if (this.plugin.userSubscribed) {
				settingsContainer.createEl("h3", { text: "Preferences" });
				settingsContainer.createDiv({
					attr: {
						id: "preferencesContainer",
					},
				});

				this.loadPreferences();
			}
		} else {
			settingsContainer.createEl("p", {
				text: "Invalid token - please enter the right token to list, resync and create projects",
				cls: "markbase-invalid-token-error",
			});

			settingsContainer.createEl("p", {
				text: "You can find your Markbase token in the Markbase dashboard",
				cls: "markbase-invalid-token-error",
			});

			settingsContainer.createEl(
				"button",
				{ text: "Go to dashboard" },
				(button) => {
					button.onClickEvent((e) => {
						shell.openExternal(
							"https://app.markbase.xyz/dashboard"
						);
					});
				}
			);
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
				text: "Manage your projects here or from the Markbase app dashboard.",
			});

			projectsContainer.createEl("h4", {
				text: "Notes",
			});

			projectsContainer.createEl("li", {
				text: "Projects can be created/synced up to once per hour (for free members) and once per minute (for paid members)",
			});

			projectsContainer.createEl("li", {
				text: "To update a project's theme to the latest template, simply delete and re-create the project",
			});

			projectsContainer.createEl("li", {
				text: "Changes can take a few minutes to go live (depending on the project size)",
			});

			projectsContainer.createEl("p", {
				text: "",
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
							try {
								const synced =
									await this.plugin.syncManager.syncMarkbaseProject(
										project
									);

								if (synced) {
									new CustomModal(
										app,
										"Project successfully synced!",
										"Please allow a few minutes for changes to go live! You can manage your project in the Markbase dashboard at https://markbase.xyz"
									).open();
									loadingModal.close();
								} else {
									displayErrorModal(app);
									loadingModal.close();
								}
							} catch (error) {
								displayErrorModal(app);
								loadingModal.close();
								console.error(
									"Error occurred while trying to sync project - ",
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

	async loadPreferences(): Promise<void> {
		const { containerEl } = this;

		const preferencesContainer = containerEl.querySelector(
			"#preferencesContainer"
		) as HTMLElement;
		preferencesContainer.empty();

		new Setting(preferencesContainer)
			.setName("Auto-sync")
			.setDesc(
				"Auto sync your projects every 5 minutes so you don't have to manually sync projects every time they update"
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.autoSync);
				toggle.onChange((value) => {
					this.plugin.settings.autoSync = value;
					this.plugin.saveSettings();
					if (value) {
						new Notice(
							"Markbase will automatically sync your projects every 5 minutes"
						);
						this.plugin.syncManager.startAutoSyncProjects();
					} else {
						new Notice(
							"Markbase will stop syncing your projects every 5 minutes"
						);
						this.plugin.syncManager.stopAutoSyncProjects();
					}
				});
			});
	}
}
