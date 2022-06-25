import MarkbasePlugin from "main";
import { App, FileSystemAdapter, Notice } from "obsidian";
import { clearInterval, setInterval } from "timers";
import { Project } from "./types";
import { zipDirectory } from "./zip";

export class SyncManager {
	app: App;
	plugin: MarkbasePlugin;
	autoSync: boolean;
	autoSyncIntervalTimer: NodeJS.Timer;

	constructor(app: App, plugin: MarkbasePlugin, autoSync: boolean) {
		this.app = app;
		this.plugin = plugin;

		if (autoSync) {
			this.startAutoSyncProjects();
		}
	}

	startAutoSyncProjects(intervalMs?: number) {
		if (this.plugin.tokenValid) {
			this.autoSyncIntervalTimer = setInterval(
				() => this.syncAllMarkbaseProjects(),
				intervalMs ?? 5 * 60 * 1000
			);
		} else {
			new Notice("Markbase Token Invalid - unable to auto-sync", 5000);
		}
	}

	stopAutoSyncProjects() {
		clearInterval(this.autoSyncIntervalTimer);
	}

	async syncAllMarkbaseProjects() {
		if (this.plugin.tokenValid) {
			new Notice("Syncing all Markbase projects...");
			// Get projects
			const projects = await this.plugin.apiClient.listProjectsForUser();
			if (projects.data.projects) {
				// Sync all projects
				for (const project of projects.data.projects) {
					await this.syncMarkbaseProject(project);
				}
			}
			new Notice("Finished syncing all Markbase projects!");
		} else {
			new Notice(
				"Markbase Token Invalid - unable to fetch/create projects"
			);
		}
	}

	async syncMarkbaseProject(project: Project) {
		// Re sync the project - i.e. reupload files and push changes to github
		// Get files and zip them
		let basePath = "";
		if (this.app.vault.adapter instanceof FileSystemAdapter) {
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

				return true;
			} catch (error) {
				if (
					error.hasOwnProperty("response") &&
					error.response.status === 429
				) {
					new Notice(
						`Failed to sync project ${project.slug} - can only sync a project once per hour (free) or minute (premium)`,
						5000
					);
				} else {
					new Notice(
						`Failed to sync project ${project.slug} - check the console for errors`,
						5000
					);
					console.error(
						"Error occurred while trying to sync project - ",
						error
					);
				}

				return false;
			}
		} catch (error) {
			new Notice(
				`Failed to sync project ${project.slug} - error zipping files`,
				5000
			);
			console.error(
				"Error occurred while trying to zip files to sync the project - ",
				error
			);
			return false;
		}
	}
}
