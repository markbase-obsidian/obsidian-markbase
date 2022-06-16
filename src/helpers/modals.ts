import { CustomModal } from "components/customModal";
import { App } from "obsidian";

export const displayErrorModal = (app: App) => {
	new CustomModal(
		app,
		"An error occurred",
		"You can find more information via the toast notifications or in Obsidian's console (Ctrl+Shift+I/Cmd+Option+I). Otherwise, please contact support via the live chat at https://app.markbase.xyz or via the help center. "
	).open();
};
