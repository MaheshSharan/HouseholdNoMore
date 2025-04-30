const toggleSwitch = document.getElementById('toggleSwitch');
const storageKey = 'extensionEnabled';

document.addEventListener('DOMContentLoaded', async () => {
    // Get the current state from storage and set the switch
    try {
        const data = await chrome.storage.local.get(storageKey);
        // Default to enabled if not set
        toggleSwitch.checked = data[storageKey] !== false;
    } catch (error) {
        console.error("Error getting initial state:", error);
        toggleSwitch.checked = true; // Default to enabled on error
    }
});

toggleSwitch.addEventListener('change', async () => {
    // Save the new state to storage
    const newState = toggleSwitch.checked;
    try {
        await chrome.storage.local.set({ [storageKey]: newState });
        console.log(`Extension state set to: ${newState}`);
    } catch (error) {
        console.error("Error setting state:", error);
        // Optionally revert the switch visually if saving fails
        // toggleSwitch.checked = !newState;
    }
}); 