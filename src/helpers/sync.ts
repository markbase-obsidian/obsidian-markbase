import MarkbasePlugin from "main";
import { App, FileSystemAdapter, Notice } from "obsidian";
import { Project } from "./types";
import { zipDirectory } from "./zip";

export const syncAllMarkbaseProjects = async (
	app: App,
	plugin: MarkbasePlugin
) => {
	if (plugin.tokenValid) {
		new Notice("Syncing all Markbase projects - please wait");
		// Get projects
		const projects = await plugin.apiClient.listProjectsForUser();
		if (projects.data.projects) {
			// Sync all projects
			for (const project of projects.data.projects) {
				await syncMarkbaseProject(app, plugin, project);
			}
		}
		new Notice("Successfully synced all Markbase projects!");
	} else {
		new Notice("Markbase Token Invalid - unable to fetch/create projects");
	}
};

export const syncMarkbaseProject = async (
	app: App,
	plugin: MarkbasePlugin,
	project: Project
) => {
	// Re sync the project - i.e. reupload files and push changes to github
	// Get files and zip them
	let basePath = "";
	if (app.vault.adapter instanceof FileSystemAdapter) {
		basePath = app.vault.adapter.getBasePath();
	}

	try {
		const zipBuffer = await zipDirectory(
			basePath + "/" + project.folderToShare
		);
		try {
			await plugin.apiClient.syncProjectForUser(project.slug, zipBuffer);

			return true;
		} catch (error) {
			console.error(
				"Error occurred while trying to sync project - ",
				error
			);
			return false;
		}
	} catch (error) {
		console.error(
			"Error occurred while trying to zip files to sync the project - ",
			error
		);
		return false;
	}
};
