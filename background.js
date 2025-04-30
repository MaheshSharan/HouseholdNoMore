// Netflix Household Bypass - Background Script (v1.5 - Production)

const RULE_ID = 1;
const GRAPHQL_URL = "*://web.prod.cloud.netflix.com/graphql*";
const WATCH_PATH = '/watch/';
const CONTENT_SCRIPT_FILE = 'content.js';

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

// --- Network Rule Management ---

async function addBlockRuleForTab(tabId) {
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
    // console.log(`[Network Rule] Attempting REMOVE for tab ${tabId}`);
    try {
        const currentRules = await chrome.declarativeNetRequest.getSessionRules();
        const ruleToRemove = currentRules.find(rule =>
            rule.id === RULE_ID && rule.condition.tabIds?.includes(tabId)
        );
        // Only remove if this tab was the sole target
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
    // console.log(`[Content Script] Attempting INJECT for tab ${tabId}`);
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [CONTENT_SCRIPT_FILE]
        });
        // console.log(`[Content Script] Injected into tab ${tabId}.`);
    } catch (error) {
        // Ignore errors if script is already injected or tab is invalid
        if (error.message.includes('already been injected') || error.message.includes('Invalid tab ID') || error.message.includes('Cannot access contents')) {
             // console.log(`[Content Script] Injection skipped for tab ${tabId} (Already injected or invalid tab).`);
        } else {
            console.error(`[Content Script] INJECT Error for tab ${tabId}:`, error.message);
        }
    }
}

// --- Event Listeners & Logic ---

// Decide action based on URL
function handleTabState(tabId, url) {
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
        removeBlockRuleForTab(tabId);
        injectContentScript(tabId);
    }
}

// Add network block early for /watch/ navigation
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId === 0 && details.url?.includes('netflix.com')) {
        // console.log(`[onBeforeNavigate] Tab ${details.tabId} navigating to ${details.url}`);
        if (details.url.includes(WATCH_PATH)) {
            addBlockRuleForTab(details.tabId); // Add rule preemptively
        }
    }
});

// Handle state once navigation is complete
chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId === 0 && details.url?.includes('netflix.com')) {
        // console.log(`[onCommitted] Tab ${details.tabId} committed to ${details.url}`);
        handleTabState(details.tabId, details.url);
    }
});

// Handle state when tab is activated
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    // console.log(`[onActivated] Tab ${activeInfo.tabId} activated.`);
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        handleTabState(activeInfo.tabId, tab?.url);
    } catch (error) {
        console.error(`[onActivated] Error getting tab info: ${error.message}`);
         removeBlockRuleForTab(activeInfo.tabId);
    }
});

// Clean up network rule when tab is closed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    // console.log(`[onRemoved] Tab ${tabId} removed. Cleaning up network rule.`);
    removeBlockRuleForTab(tabId);
});

// --- Initial Setup ---

chrome.runtime.onInstalled.addListener(async (details) => {
    // console.log(`[onInstalled] Extension ${details.reason}. Cleaning rules and checking tabs.`);
    try {
        const currentRules = await chrome.declarativeNetRequest.getSessionRules();
        const ruleIdsToRemove = currentRules.map(rule => rule.id);
        if (ruleIdsToRemove.length > 0) {
            // console.log('[onInstalled] Removing existing session rules:', ruleIdsToRemove);
            await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIdsToRemove });
        }
        const tabs = await chrome.tabs.query({ url: "*://*.netflix.com/*" });
        // console.log(`[onInstalled] Checking ${tabs.length} initial Netflix tabs.`);
        tabs.forEach(tab => handleTabState(tab.id, tab.url));
    } catch (error) {
        console.error("[onInstalled] Error during setup:", error);
    }
});

chrome.runtime.onStartup.addListener(async () => {
//   console.log("[onStartup] Browser startup. Checking active tabs.");
   try {
        const tabs = await chrome.tabs.query({ url: "*://*.netflix.com/*" });
        // console.log(`[onStartup] Checking ${tabs.length} initial Netflix tabs.`);
         tabs.forEach(tab => handleTabState(tab.id, tab.url));
    } catch (error) {
         console.error("[onStartup] Error during setup:", error);
    }
});

console.log("Netflix Household Bypass background script loaded."); //  one final log 