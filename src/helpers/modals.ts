import { CustomModal } from "components/customModal";
import { App } from "obsidian";

export const displayErrorModal = (app: App) => {
	new CustomModal(
		app,
		"An error occurred",
		"Please contact support via the live chat at https://app.markbase.xyz or via the help center. You can find more information in Obsidian's console (Ctrl+Shift+I/Cmd+Option+I)"
	).open();
};
