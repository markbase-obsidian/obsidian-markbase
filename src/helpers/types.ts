export interface Project {
	id: string;
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
	id: string;
	firebaseUid?: string;
	obsidianUserToken?: string;
	projects: Project[];
	metadata: Metadata;
}

export interface Metadata {
	id: string;
	createdAt: Date;
	updatedAt: Date;
}
