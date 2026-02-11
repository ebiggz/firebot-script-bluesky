## Features
* Support for Bluesky's **Live Now** feature
  * Option to automatically sync Live status to Bluesky when streaming (including automatic handling of the 4-hour limit if your stream goes longer)
  * Effects to manually Set or Clear your Live status
* Create posts via **Post to Bluesky** effect
  * Attach **images** and **links**
  * Configure **reply permissions**
  * Post as a **reply** or build **threads** (using the AT URI output)
  * Supports converting standard **Markdown links** (`[text](https://example.com)`) into Bluesky **Rich Text Facets**
* Delete a post via **Delete Post On Bluesky** effect
* Trigger **automations from Bluesky activity** with the following Events:
  * Follow
  * Like
  * Reply
  * Repost
  * Quote
  * Mention
* Works with **custom PDSs**
  
## Install
1. Download the [latest release bluesky.js](https://github.com/ebiggz/firebot-script-bluesky/releases)
2. Place **bluesky.js** in Firebot's `scripts` folder
3. Add as a Start Up Script in Firebot (Settings > Scripts > Manage Start Up Scripts)
4. Configure your Bluesky account in Settings > Integrations > Bluesky (Configure)
