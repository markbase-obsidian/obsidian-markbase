# Markbase for Obsidian

Official [Markbase](https://markbase.xyz) plugin to share your Obsidian notes online in your own digital garden

![Demo GIF](./src/assets/demo.gif)

## Instructions

1. Install the plugin
2. Copy your personal token from the dashboard or settings section in the [Markbase app](https://app.markbase.xyz) into the Markbase plugin settings in Obsidian
3. In the Obsidian plugin's settings, create a project and choose a folder/file to upload online
4. **You're done!** That folder should be live online in your own digital garden at https://<project-slug>.markbase.xyz (or at a custom domain if specified)

### Optional

1. *To resync your project if you've updated its contents, you can press the Sync button in the Obsidian plugin's settings, the ribbon (sidebar) or from the Command Pallette. This can be done once per hour (if you're on the free plan) or once per minute (if paid subscriber)*
2. *To delete a project, you can press the Delete button in the Obsidian plugin's settings or go to the [Markbase app](https://app.markbase.xyz)*
3. *To update your project to the latest theme/version, delete and re-create your project. Theme updates/bug fixes regularly occur!*

## Notes

*The plugin is in the **alpha** stage of development and has currently only been tested on desktop*

There are **notable bugs** which can be found in the [Markbase landing page](https://markbase.xyz)

For feature requests or to see/vote on what will be added to Markbase in future, check out the [public roadmap](https://markbase.featurebase.app/).

To report bugs or request help using the plugin, please [create an issue](https://github.com/markbaseteam/obsidian-markbase), check out the [help center](https://markbase.tawk.help/) or use the live chat/Help & Support form in the [Markbase app](https://app.markbase.xyz)

## Changelog

- 0.0.9
  - Restrict creating/syncing to once every hour (for free members) and once every  minute (for paid members)
  - The above was because the server was getting overwhelmed with people spamming the create/sync buttons
- 0.0.8
  - Auto-sync every 5 minutes (for paid members)
  - Fix bug where no error message was displayed on large deployments
- 0.0.7
  - Add command and ribbon button to sync all projects without having to go to Settings every time
- 0.0.6
  - Fix create project button permanently disabled issue
- 0.0.5
  - Clearer create project workflow (+ button more visibly disabled if criteria not met)
- 0.0.4
  - Update API URL
- 0.0.3
  - Check for correct slug format before creation
  - Refresh projects without unloading plugin
  - Check valid token without reloading Obsidian
- 0.0.2
  - Add button to View project at live URL
  - Compress project zip files before uploading
  - Other minor UX improvements
- 0.0.1
  - Initial release
  - Share your Obsidian notes online in your own digital garden
