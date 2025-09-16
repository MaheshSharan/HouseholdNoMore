# Netflix Household No More 🚫  

## 🚨 This is an updated version of a previous extension!

This project is a **major update and continuation** of the original [Netflix Household No More](https://github.com/Amachik/HouseholdNoMore) extension by [Amachik](https://github.com/Amachik). All credit for the original concept and implementation goes to them. This repository builds upon their work, adding new features, improved reliability, and ongoing maintenance.

> **If you are looking for the original repo, visit:**  
> https://github.com/Amachik/HouseholdNoMore  

> **This version is NOT affiliated with the original author, but aims to keep the project alive and working as Netflix changes its site.**

---

A browser extension aiming to bypass the Netflix household verification prompts by employing different strategies depending on the page context.

**Supports:** `Chrome` (and Chromium-based browsers like Edge) | `Firefox`

---

## Features

- **Extensive GraphQL Request Blocking:**
  - On `/watch` pages, the extension **aggressively blocks all GraphQL network requests** related to Netflix's household verification.
  - This is done at the network level, so you can verify in the browser's Network tab that these requests are stopped before reaching Netflix servers.
  - This is the core feature and is maintained to adapt to Netflix's frequent backend changes.

- **Hides Verification Modal on `/browse` (and others):**
  - On pages *other* than `/watch/` (like the main browse page), it hides the household verification modal popup if it appears.

- **Target Scope:**
  - Only affects `netflix.com` domains.

---

## Installation (Official)

- **Mozilla Firefox:**  
  [https://addons.mozilla.org/cs/firefox/addon/netflix-household-no-more/](https://addons.mozilla.org/cs/firefox/addon/netflix-household-no-more/)

- **Google Chrome / Microsoft Edge / Chromium Browsers:**  
  *Extension not published yet.*

---

## Installation (Local Development/Testing)

### Google Chrome / Microsoft Edge / Chromium Browsers:

1. Download or clone this repository to your local machine.
2. Open your browser and navigate to `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click the **Load unpacked** button.
5. Select the directory where you saved the extension files (the folder containing `manifest.json`).
6. The extension should now be loaded and active.

### Mozilla Firefox:

1. Download or clone this repository to your local machine.
2. Open Firefox and navigate to `about:debugging`.
3. Click on **This Firefox** in the left sidebar.
4. Click the **Load Temporary Add-on...** button.
5. Navigate to the directory where you saved the extension files.
6. Select the **`manifest.json`** file itself.
7. The extension should now be loaded and active for the current browser session.

> **Note:** Firefox temporary add-ons are removed when you close the browser. You will need to reload it each time you restart Firefox.

---

## Caveats & Known Issues

- **Netflix Video Player UI is not visible:**  
  If you don't see the video player UI, just refresh the page. That should fix it.

- **Netflix Updates:**  
  Netflix frequently updates its website and internal APIs. Any changes to:
  - The GraphQL endpoint URL,
  - The request structure,
  - The page structure (`/watch/` path), or
  - The modal's CSS selectors/HTML structure  
  could break this extension partially or completely.  
  **We monitor and update the GraphQL blocking logic as needed.**

- **Console Errors:**  
  On `/watch/` pages, you **will** see network errors (often CORS-related) in the browser's developer console. This is expected and shows the extension is successfully blocking GraphQL requests.

- **Fragile CSS:**  
  The modal hiding relies on specific CSS class names and `data-uia` attributes. These might change without notice.

---

## Disclaimer

- This extension is **not endorsed by or affiliated with Netflix** in any way.
- Use this extension at your own risk. The developers assume no liability.
- Modifying network requests or the DOM on third-party websites might **violate their Terms of Service**. Be aware of the potential consequences.
- This repository is a **community update** of the original [Amachik/NetflixHouseholdNoMore](https://github.com/Amachik/HouseholdNoMore) extension.  
  Please respect the original author's work and license.

---

## License

Copyright [Amachik]  
All Rights Reserved.

Permission is granted to download and use this software for **personal, non-commercial purposes only**.

**Redistribution, modification, or commercial use** of this software, in whole or in part, is **strictly prohibited without the express written permission** of the copyright holder.
