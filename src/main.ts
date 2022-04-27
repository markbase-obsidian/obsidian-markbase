import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { FolderSuggest } from "settings/suggesters/FolderSuggester";

interface MarkbasePluginSettings {
	markbaseUserToken: string;
	folderToShare: string;
}

const DEFAULT_SETTINGS: MarkbasePluginSettings = {
	markbaseUserToken: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
	folderToShare: "/",
};

export default class MarkbasePlugin extends Plugin {
	settings: MarkbasePluginSettings;

	async onload() {
		console.log("Loading Markbase Sync for Obsidian plugin");
		await this.loadSettings();
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MarkbaseSettingTab(this.app, this));

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

		new Setting(containerEl)
			.setName("Folder to share/upload")
			.setDesc(
				"Choose the file/folder to upload online. Note that all files and folders inside your chosen directory will be made publicly available online."
			)
			.addSearch((search) => {
				new FolderSuggest(this.app, search.inputEl);
				search
					.setPlaceholder("Example: folder1/folder2")
					.setValue(this.plugin.settings.folderToShare)
					.onChange((new_folder) => {
						this.plugin.settings.folderToShare = new_folder;
						this.plugin.saveSettings();
					});
			});
	}
}
