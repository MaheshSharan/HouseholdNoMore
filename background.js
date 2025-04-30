// Netflix Household Bypass - Background Script (v1.6 - Production)

const RULE_ID = 1;
const GRAPHQL_URL = "*://web.prod.cloud.netflix.com/graphql*";
const WATCH_PATH = '/watch/';
const CONTENT_SCRIPT_FILE = 'content.js';
const STORAGE_KEY = 'extensionEnabled';

// Global state variable
let isExtensionEnabled = true; // Default to enabled

// Base rule definition for network blocking (used for /watch/)
const blockRuleBase = {
  id: RULE_ID,
  priority: 1,
  action: { type: 'block' },
  condition: {
    urlFilter: GRAPHQL_URL,
    resourceTypes: ['xmlhttprequest']
    // tabIds condition added dynamically for session rules
  }
};

// --- Utility Functions ---

async function updateEnabledState() {
    try {
        const data = await chrome.storage.local.get(STORAGE_KEY);
        // Default to true if the value isn't explicitly false
        isExtensionEnabled = data[STORAGE_KEY] !== false;
        console.log(`[State] Extension enabled state updated to: ${isExtensionEnabled}`);

        if (!isExtensionEnabled) {
            // If disabled, remove all existing session rules immediately
            removeAllRules();
            // Note: We don't have a direct way to "unload" already injected content scripts,
            // but stopping future injections and removing network rules is the main goal.
        } else {
            // If enabled, re-evaluate current tabs
            checkAllTabs();
        }
    } catch (error) {
        console.error("[State] Error reading enabled state:", error);
        isExtensionEnabled = true; // Default to enabled on error
    }
}

async function removeAllRules() {
    try {
        const currentRules = await chrome.declarativeNetRequest.getSessionRules();
        const ruleIdsToRemove = currentRules.map(rule => rule.id);
        if (ruleIdsToRemove.length > 0) {
            console.log('[Cleanup] Removing all session rules:', ruleIdsToRemove);
            await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIdsToRemove });
        }
    } catch (error) {
        console.error("[Cleanup] Error removing all rules:", error);
    }
}

// --- Network Rule Management ---

async function addBlockRuleForTab(tabId) {
    if (!isExtensionEnabled) return; // Do nothing if disabled
    // console.log(`[Network Rule] Attempting ADD for tab ${tabId}`);
    try {
        const currentRules = await chrome.declarativeNetRequest.getSessionRules();
        const ruleExistsForTab = currentRules.some(rule =>
            rule.id === RULE_ID && rule.condition.tabIds?.includes(tabId)
        );
        if (!ruleExistsForTab) {
            // console.log(`[Network Rule] Adding for tab ${tabId}.`);
            await chrome.declarativeNetRequest.updateSessionRules({
                addRules: [{
                    ...blockRuleBase,
                    condition: { ...blockRuleBase.condition, tabIds: [tabId] }
                }],
                removeRuleIds: []
            });
        } else {
            // console.log(`[Network Rule] Already exists for tab ${tabId}.`);
        }
    } catch (error) {
        console.error(`[Network Rule] ADD Error for tab ${tabId}:`, error.message);
    }
}

async function removeBlockRuleForTab(tabId) {
    // Always attempt removal, even if extension is being disabled
    // console.log(`[Network Rule] Attempting REMOVE for tab ${tabId}`);
    try {
        const currentRules = await chrome.declarativeNetRequest.getSessionRules();
        const ruleToRemove = currentRules.find(rule =>
            rule.id === RULE_ID && rule.condition.tabIds?.includes(tabId)
        );
        if (ruleToRemove && ruleToRemove.condition.tabIds.length === 1 && ruleToRemove.condition.tabIds[0] === tabId) {
            // console.log(`[Network Rule] Removing rule ${RULE_ID} for tab ${tabId}.`);
            await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [RULE_ID] });
        } else if (ruleToRemove) {
            // console.log(`[Network Rule] Rule ${RULE_ID} targets other tabs. Not removing for tab ${tabId}.`);
        } else {
             // console.log(`[Network Rule] No specific rule found to remove for tab ${tabId}.`);
        }
    } catch (error) {
        console.error(`[Network Rule] REMOVE Error for tab ${tabId}:`, error.message);
    }
}

// --- Content Script Injection ---

async function injectContentScript(tabId) {
    if (!isExtensionEnabled) return; // Do nothing if disabled
    // console.log(`[Content Script] Attempting INJECT for tab ${tabId}`);
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [CONTENT_SCRIPT_FILE]
        });
        // console.log(`[Content Script] Injected into tab ${tabId}.`);
    } catch (error) {
        if (error.message.includes('already been injected') || error.message.includes('Invalid tab ID') || error.message.includes('Cannot access contents')) {
             // console.log(`[Content Script] Injection skipped for tab ${tabId} (Already injected or invalid tab).`);
        } else {
            console.error(`[Content Script] INJECT Error for tab ${tabId}:`, error.message);
        }
    }
}

// --- Event Listeners & Logic ---

function handleTabState(tabId, url) {
    if (!isExtensionEnabled) { // Check global state first
        // console.log(`[Handler] Extension disabled, ensuring rule removed for tab ${tabId}`);
        removeBlockRuleForTab(tabId);
        return;
    }

    if (!url || !url.includes('netflix.com')) {
        // console.log(`[Handler] Tab ${tabId} - Not a Netflix URL. Ensuring network rule removed.`);
        removeBlockRuleForTab(tabId);
        return;
    }

    if (url.includes(WATCH_PATH)) {
        // console.log(`[Handler] Tab ${tabId} - URL contains ${WATCH_PATH}. Applying WATCH behavior.`);
        addBlockRuleForTab(tabId);
    } else {
        // console.log(`[Handler] Tab ${tabId} - URL does NOT contain ${WATCH_PATH}. Applying BROWSE behavior.`);
        removeBlockRuleForTab(tabId); // Ensure network rule is off
        injectContentScript(tabId);  // Inject content script for modal hiding
    }
}

// Add network block early for /watch/ navigation (only if enabled)
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (!isExtensionEnabled) return;
    if (details.frameId === 0 && details.url?.includes('netflix.com')) {
        // console.log(`[onBeforeNavigate] Tab ${details.tabId} navigating to ${details.url}`);
        if (details.url.includes(WATCH_PATH)) {
            addBlockRuleForTab(details.tabId);
        }
    }
});

// Handle state once navigation is complete (respects enabled state)
chrome.webNavigation.onCommitted.addListener((details) => {
    // Filter for main frame and netflix URLs
    if (details.frameId === 0 && details.url?.includes('netflix.com')) {
        // console.log(`[onCommitted] Tab ${details.tabId} committed to ${details.url}`);
        handleTabState(details.tabId, details.url);
    }
});

// Handle state changes from client-side navigation (SPA)
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    // Filter for main frame and netflix URLs
    if (details.frameId === 0 && details.url?.includes('netflix.com')) {
        // console.log(`[onHistoryStateUpdated] Tab ${details.tabId} history state updated to ${details.url}`);
        handleTabState(details.tabId, details.url);
    }
});

// Handle state when tab is activated (respects enabled state)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    // console.log(`[onActivated] Tab ${activeInfo.tabId} activated.`);
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        handleTabState(activeInfo.tabId, tab?.url); // handleTabState checks isExtensionEnabled
    } catch (error) {
        // Error likely means tab closed, rule removal is handled by onRemoved
        if (!(error.message.includes('No tab with id:') || error.message.includes('Invalid tab ID'))) {
            console.error(`[onActivated] Error getting tab info: ${error.message}`);
        }
        // No need to call removeBlockRuleForTab here, onRemoved handles it.
    }
});

// Clean up network rule when tab is closed (always do this)
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    // console.log(`[onRemoved] Tab ${tabId} removed. Cleaning up network rule.`);
    removeBlockRuleForTab(tabId);
});

// Listen for changes in storage (i.e., toggle flips)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes[STORAGE_KEY]) {
        console.log("[Storage] Detected change in enabled state.");
        updateEnabledState(); // Update global state and react
    }
});

// --- Initial Setup ---

async function checkAllTabs() {
    if (!isExtensionEnabled) return; // Don't check if disabled
    try {
        const tabs = await chrome.tabs.query({ url: "*://*.netflix.com/*" });
        // console.log(`[checkAllTabs] Checking ${tabs.length} initial Netflix tabs.`);
        tabs.forEach(tab => handleTabState(tab.id, tab.url));
    } catch (error) {
        console.error("[checkAllTabs] Error checking tabs:", error);
    }
}

chrome.runtime.onInstalled.addListener(async (details) => {
    // console.log(`[onInstalled] Extension ${details.reason}. Cleaning rules and checking tabs.`);
    await updateEnabledState(); // Get initial state before checking tabs
    // Note: removeAllRules is called within updateEnabledState if needed
});

chrome.runtime.onStartup.addListener(async () => {
    // console.log("[onStartup] Browser startup. Checking active tabs.");
    await removeAllRules(); // Ensure clean slate on browser start as session rules are gone
    await updateEnabledState(); // Reads state and calls checkAllTabs if enabled
});

// Initial fetch of the enabled state when the script first loads
updateEnabledState();

console.log("Netflix Household Bypass background script loaded (v1.6 - Toggle)."); 