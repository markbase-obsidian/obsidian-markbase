import { CustomModal } from "components/customModal";
import { App } from "obsidian";

export const displayErrorModal = (app: App) => {
	new CustomModal(
		app,
		"An error occurred",
		"Please contact support on https://markbase.xyz. You can find more information in Obsidian's console by pressing Ctrl+Shift+I"
	);
};
