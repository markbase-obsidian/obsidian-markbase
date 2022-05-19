import { CreateProjectModal } from "components/createProjectModal";
import { CustomModal } from "components/customModal";
import { DeleteProjectModal } from "components/deleteProjectModal";
import Api from "helpers/api";
import { Project } from "helpers/types";
import {
	App,
	FileSystemAdapter,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { FolderSuggest } from "settings/suggesters/FolderSuggester";

interface MarkbasePluginSettings {
	markbaseUserToken: string;
}

const DEFAULT_SETTINGS: MarkbasePluginSettings = {
	markbaseUserToken: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
};

export default class MarkbasePlugin extends Plugin {
	settings: MarkbasePluginSettings;
	tokenValid: boolean;
	apiClient: Api;
	projects: Project[] = [];

	async onload() {
		console.log("Loading Markbase Sync for Obsidian plugin");
		await this.loadSettings();
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MarkbaseSettingTab(this.app, this));

		// Verify token
		try {
			this.apiClient = new Api(this.settings.markbaseUserToken);
			const verifiedResult = await this.apiClient.verifyObsidianToken();

			if (verifiedResult.data.verified) {
				this.tokenValid = true;
			} else {
				this.tokenValid = false;
			}
		} catch (error) {
			this.tokenValid = false;
		}

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

		await this.saveSettings();
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
}

class MarkbaseSettingTab extends PluginSettingTab {
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
					.setPlaceholder("Enter your token")
					.setValue(this.plugin.settings.markbaseUserToken)
					.onChange(async (value) => {
						this.plugin.settings.markbaseUserToken = value;
						await this.plugin.saveSettings();
					})
			);

		if (this.plugin.tokenValid) {
			containerEl.createEl("h3", { text: "Your Projects" });

			if (this.plugin.projects.length > 0) {
				containerEl.createEl("p", {
					text: "Manage your projects here or from the Markbase app dashboard",
				});
				for (const project of this.plugin.projects) {
					new Setting(containerEl)
						.setName(project.name + ` - ${project.folderToShare}`)
						.setDesc(`Live at ${project.publishedUrl}`)
						.addButton((button) =>
							button.setButtonText("Sync").onClick(async (e) => {
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
									basePath =
										this.app.vault.adapter.getBasePath();
								}
								const zipper = require("zip-local");

								// zipping a file
								zipper.zip(
									basePath + "/" + project.folderToShare,
									(error: any, zipped: any) => {
										if (!error) {
											zipped.compress(); // compress before exporting
											var buff = zipped.memory(); // get zipped file as Buffer

											try {
												this.plugin.apiClient
													.syncProjectForUser(
														project.slug,
														buff
													)
													.then(() => {
														loadingModal.close();

														new CustomModal(
															app,
															"Project successfully synced!",
															"Allow a few minutes for changes to go live! You can manage your project in the Markbase dashboard at https://markbase.xyz"
														).open();
													});
											} catch (error) {
												loadingModal.close();

												new CustomModal(
													app,
													"An error occurred",
													"Please contact support on https://markbase.xyz. You can find more information in Obsidian's console by pressing Ctrl+Shift+I"
												);
												console.error(
													"Error occurred while trying to sync project - ",
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
												"Error occurred while trying to zip files to sync the project - ",
												error
											);
										}
									}
								);
							})
						)
						.addButton((button) => {
							button
								.setButtonText("Delete")
								.setWarning()
								.onClick(async (e) => {
									new DeleteProjectModal(
										app,
										this.plugin,
										this.plugin.settings.markbaseUserToken,
										project.id
									).open();
								});
						});
				}
			} else {
				containerEl.createEl("p", {
					text: "No projects to display. You can create a project using the button below",
				});
			}

			new Setting(containerEl).addButton((button) => {
				button
					.setButtonText("Create Project")
					// .setDisabled(!this.plugin.settings.tokenValid)
					.onClick((e) => {
						new CreateProjectModal(
							app,
							this.plugin,
							this.plugin.settings.markbaseUserToken
						).open();
					});
			});
		} else {
			containerEl.createEl("p", {
				text: "Invalid token - please enter the right token and then restart Obsidian to list, resync and create projects",
			});
		}
	}
}
