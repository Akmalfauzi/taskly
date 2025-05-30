document.addEventListener('DOMContentLoaded', function() {
    console.log("Popup DOM loaded");

    const openOptionsBtn = document.getElementById('openOptions');
    const captureBtn = document.getElementById('captureScreenshot');
    
    console.log("openOptionsBtn found:", !!openOptionsBtn);
    console.log("captureBtn found:", !!captureBtn);

    if (openOptionsBtn) {
        openOptionsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Open options clicked");
            
            try {
                if (chrome.runtime && chrome.runtime.openOptionsPage) {
                    chrome.runtime.openOptionsPage(() => {
                        if (chrome.runtime.lastError) {
                            console.error("Error opening options page:", chrome.runtime.lastError);
                            chrome.tabs.create({url: chrome.runtime.getURL('options.html')});
                        }
                        window.close();
                    });
                } else {
                    chrome.tabs.create({url: chrome.runtime.getURL('options.html')}, () => {
                        window.close();
                    });
                }
            } catch (error) {
                console.error("Error opening options:", error);
            }
        });
    }

    if (captureBtn) {
        captureBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Capture screenshot clicked");
            
            captureBtn.style.background = '#45a049';
            captureBtn.textContent = '⏳ Starting...';
            
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (chrome.runtime.lastError) {
                    console.error("Error querying tabs:", chrome.runtime.lastError);
                    resetButton();
                    return;
                }
                
                if (!tabs || tabs.length === 0) {
                    console.error("No active tab found");
                    resetButton();
                    return;
                }
                
                const tabId = tabs[0].id;
                console.log("Active tab ID:", tabId);
                
                if (tabs[0].url.startsWith('chrome://') || tabs[0].url.startsWith('chrome-extension://')) {
                    alert('Cannot capture screenshots on browser internal pages. Please navigate to a regular website.');
                    resetButton();
                    return;
                }
                
                injectAndStartSelection(tabId);
            });
            
            function resetButton() {
                captureBtn.style.background = '#4CAF50';
                captureBtn.textContent = '📷 Screenshot Area';
            }
            
            function injectAndStartSelection(tabId) {
                // Try sending message first
                chrome.tabs.sendMessage(tabId, {action: "startAreaSelection"}, function(response) {
                    if (chrome.runtime.lastError) {
                        console.log("Content script not found, injecting...");
                        
                        // Inject content script
                        chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            files: ['content_script.js']
                        }, () => {
                            if (chrome.runtime.lastError) {
                                console.error("Error injecting script:", chrome.runtime.lastError);
                                alert('Failed to inject content script: ' + chrome.runtime.lastError.message);
                                resetButton();
                                return;
                            }
                            
                            console.log("Content script injected, waiting...");
                            
                            // Wait longer and retry
                            setTimeout(() => {
                                chrome.tabs.sendMessage(tabId, {action: "startAreaSelection"}, function(retryResponse) {
                                    if (chrome.runtime.lastError) {
                                        console.error("Retry failed:", chrome.runtime.lastError);
                                        alert('Failed to start area selection: ' + chrome.runtime.lastError.message);
                                        resetButton();
                                    } else {
                                        console.log("Success after injection:", retryResponse);
                                        window.close();
                                    }
                                });
                            }, 500);
                        });
                    } else {
                        console.log("Message sent successfully:", response);
                        window.close();
                    }
                });
            }
        });
    }

    // Check API key status
    if (chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['geminiApiKey'], function(result) {
            if (!result.geminiApiKey) {
                const indicator = document.createElement('div');
                indicator.style.cssText = 'background: #ff4444; color: white; padding: 5px; margin: 10px 0; border-radius: 3px; font-size: 12px; text-align: center;';
                indicator.textContent = '⚠️ API Key not set';
                document.body.appendChild(indicator);
            }
        });
    }
});

// Add error handling for unhandled errors
window.addEventListener('error', function(e) {
    console.error('Popup error:', e.error);
});