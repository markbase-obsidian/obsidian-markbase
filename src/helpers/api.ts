import axios, { AxiosInstance, AxiosRequestHeaders } from "axios";

class Api {
	markbaseUserToken: string | null;
	client: AxiosInstance;
	apiBaseUrl: string;

	constructor(markbaseUserToken: string) {
		this.apiBaseUrl = "http://localhost:8000";
		this.markbaseUserToken = markbaseUserToken;

		const headers: AxiosRequestHeaders = {
			Accept: "application/json",
		};

		if (this.markbaseUserToken) {
			headers.Authorization = `Obsidian ${this.markbaseUserToken}`;
		}

		this.client = axios.create({
			baseURL: this.apiBaseUrl,
			timeout: 31000,
			headers: headers,
		});
	}

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
		projectPublic: boolean
	) => {
		return this.client.post("/projects/user", {
			slug,
			name,
			folderToShare,
			public: projectPublic,
		});
	};
}

export default Api;
