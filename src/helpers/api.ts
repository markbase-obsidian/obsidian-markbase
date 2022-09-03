import axios, { AxiosInstance, AxiosRequestHeaders } from "axios";

class Api {
	markbaseUserToken: string | null;
	client: AxiosInstance;
	apiBaseUrl: string;

	constructor(markbaseUserToken: string) {
		this.apiBaseUrl = "https://api.markbase.xyz";
		this.markbaseUserToken = markbaseUserToken;

		const headers: AxiosRequestHeaders = {
			Accept: "application/json",
		};

		if (this.markbaseUserToken) {
			headers.Authorization = `Obsidian ${this.markbaseUserToken}`;
		}

		this.client = axios.create({
			baseURL: this.apiBaseUrl,
			timeout: 60000,
			headers: headers,
		});
	}

	updateClient = (newToken: string) => {
		this.markbaseUserToken = newToken;

		const headers: AxiosRequestHeaders = {
			Accept: "application/json",
		};

		if (this.markbaseUserToken) {
			headers.Authorization = `Obsidian ${this.markbaseUserToken}`;
		}

		this.client = axios.create({
			baseURL: this.apiBaseUrl,
			timeout: 60000,
			headers: headers,
		});

		return this;
	};

	// Endpoints
	verifyObsidianToken = () => {
		return this.client.get("/token/obsidian/verify");
	};

	listProjectsForUser = () => {
		return this.client.get("/projects/user");
	};

	getProjectBySlug = (slug: string) => {
		return this.client.get("/projects/slug/" + slug);
	};

	createProjectForUser = (
		slug: string,
		name: string,
		folderToShare: string,
		zipFile: Buffer
	) => {
		return this.client.post("/projects/user", {
			slug,
			name,
			folderToShare,
			file: zipFile,
		});
	};

	syncProjectForUser = (slug: string, zipFile: Buffer) => {
		return this.client.post("/projects/user/sync", {
			slug,
			file: zipFile,
		});
	};

	deleteProjectById = (projectId: string) => {
		return this.client.delete("/projects/id/" + projectId);
	};
}

export default Api;
