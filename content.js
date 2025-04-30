/**
 * Netflix Household Bypass - Content Script
 *
 * This script runs on Netflix pages (excluding /watch/) and hides the
 * household verification modal if it appears.
 */

// Check if the script has already run in this context
if (window.hasRunNetflixBypassContentScript) {
    // console.log("NF Bypass Content Script: Already running, exiting.");
} else {
    window.hasRunNetflixBypassContentScript = true;
    // console.log("NF Bypass Content Script injected and running for the first time.");

    const MODAL_SELECTOR = '.nf-modal.interstitial-full-screen';
    const MODAL_DATA_UIA_SELECTOR = 'div[data-uia="clcsModal"]'; // More specific inner content

    function hideModal(node) {
        // Check if the node itself is the modal container or contains the specific modal content
        if (node.matches && (node.matches(MODAL_SELECTOR) || node.querySelector(MODAL_DATA_UIA_SELECTOR))) {
            // console.log("NF Bypass: Found modal, hiding.", node);
            // Hide the outermost matching modal container
            let modalToHide = node.matches(MODAL_SELECTOR) ? node : node.closest(MODAL_SELECTOR);
            if (modalToHide) {
                modalToHide.style.setProperty('display', 'none', 'important');
            }
            // Also hide the background if it exists separately
            let background = document.querySelector('.nf-modal-background[data-uia="nf-modal-background"]');
            if (background) {
                background.style.setProperty('display', 'none', 'important');
            }

        } else if (node.querySelectorAll) {
            // Check if added nodes contain the modal
            const modals = node.querySelectorAll(MODAL_SELECTOR);
            modals.forEach(modal => {
                // Verify it contains the specific inner content before hiding
                if (modal.querySelector(MODAL_DATA_UIA_SELECTOR)) {
                    // console.log("NF Bypass: Found modal within added node, hiding.", modal);
                    modal.style.setProperty('display', 'none', 'important');
                    // Also hide the background if it exists separately
                    let background = document.querySelector('.nf-modal-background[data-uia="nf-modal-background"]');
                    if (background) {
                        background.style.setProperty('display', 'none', 'important');
                    }
                }
            });
        }
    }

    // --- MutationObserver Setup ---

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    // Check if the added node itself is/contains the modal
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        hideModal(node);
                    }
                });
            }
        }
    });

    // Start observing the document body for added nodes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // console.log("NF Bypass: MutationObserver is running.");

    // Initial check in case the modal is already present when the script loads
    document.querySelectorAll(MODAL_SELECTOR).forEach(hideModal);

} 