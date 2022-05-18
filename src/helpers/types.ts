export interface Project {
	id: number;
	slug: string;
	name: string;
	folderToShare: string;
	publishedUrl?: string;
	repositoryUrl: string;
	public: boolean;
	user: User;
	metadata: Metadata;
}

export interface User {
	id: number;
	firebaseUid?: string;
	obsidianUserToken?: string;
	projects: Project[];
	metadata: Metadata;
}

export interface Metadata {
	id: number;
	createdAt: Date;
	updatedAt: Date;
}
