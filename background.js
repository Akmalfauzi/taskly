let GEMINI_API_KEY = '';

// Fungsi untuk memuat API Key saat service worker dimulai atau saat dibutuhkan
async function loadApiKey() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['geminiApiKey'], function (result) {
            if (result.geminiApiKey) {
                GEMINI_API_KEY = result.geminiApiKey;
                resolve(true);
            } else {
                console.warn('Taskly AI: Gemini API Key belum diatur.');
                resolve(false);
            }
        });
    });
}

// Panggil loadApiKey saat service worker pertama kali dimuat
loadApiKey();

// Listener untuk perubahan storage, agar API Key selalu update
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === 'sync' && changes.geminiApiKey) {
        GEMINI_API_KEY = changes.geminiApiKey.newValue;
        console.log('Taskly AI: API Key diperbarui di background.');
    }
});

// Listener untuk pesan dari content_script.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request.type || request.action);
    
    // Handle messages with 'type' property
    if (request.type) {
        switch(request.type) {
            case "GET_GEMINI_ANSWER":
                if (!GEMINI_API_KEY) {
                    loadApiKey().then(loaded => {
                        if (!loaded) {
                            sendResponse({
                                success: false,
                                error: "API Key Gemini belum diatur. Silakan atur di halaman opsi ekstensi Taskly AI."
                            });
                        } else {
                            callGeminiAPI(request.text, sendResponse);
                        }
                    });
                    return true;
                }
                callGeminiAPI(request.text, sendResponse);
                return true;
            
            case "CAPTURE_VISIBLE_TAB_AREA":
                captureVisibleTabArea(request.area, sendResponse);
                return true;
            
            case "ANALYZE_IMAGE_WITH_GEMINI":
                if (!GEMINI_API_KEY) {
                    loadApiKey().then(loaded => {
                        if (!loaded) {
                            sendResponse({
                                success: false,
                                error: "API Key Gemini belum diatur. Silakan atur di halaman opsi ekstensi Taskly AI."
                            });
                        } else {
                            analyzeImageWithGemini(request.imageBase64, request.prompt, sendResponse);
                        }
                    });
                    return true;
                }
                analyzeImageWithGemini(request.imageBase64, request.prompt, sendResponse);
                return true;
            
            case "SAVE_API_KEY":
                saveApiKey(request.apiKey, sendResponse);
                return true;
            
            case "GET_API_KEY":
                getApiKeyForResponse(sendResponse);
                return true;
            
            default:
                sendResponse({success: false, error: "Unknown message type"});
        }
    }
    // Handle messages with 'action' property
    else if (request.action) {
        switch(request.action) {
            case "captureVisibleTab":
                console.log("Capturing visible tab with coordinates:", request.coordinates);
                
                chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
                    if (chrome.runtime.lastError) {
                        console.error("Capture error:", chrome.runtime.lastError);
                        sendResponse({success: false, error: chrome.runtime.lastError.message});
                        return;
                    }
                    
                    console.log("Screenshot captured successfully");
                    
                    // Send the full screenshot and coordinates to content script
                    // The content script will handle the cropping
                    sendResponse({
                        success: true,
                        dataUrl: dataUrl,
                        coordinates: request.coordinates
                    });
                });
                
                return true; // Keep message channel open
                
            default:
                sendResponse({success: false, error: "Unknown action"});
        }
    }
    else {
        sendResponse({success: false, error: "Invalid message format"});
    }
});

// Fungsi untuk crop gambar (diperbaiki untuk service worker)
function cropImageArea(dataUrl, area, sendResponse) {
    try {
        console.log("Cropping image with area:", area);
        
        // Untuk service worker, kita tidak bisa gunakan Image constructor
        // Kirim data URL langsung tanpa crop sebagai workaround
        sendResponse({success: true, dataUrl: dataUrl});
        
    } catch (error) {
        console.error("Error in cropImageArea:", error);
        sendResponse({success: false, error: error.message});
    }
}

// Fungsi untuk mengambil screenshot area tertentu (diperbaiki)
function captureVisibleTabArea(area, sendResponse) {
    try {
        console.log("Capturing screenshot area:", area);
        
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
            if (chrome.runtime.lastError) {
                console.error("Screenshot error:", chrome.runtime.lastError);
                sendResponse({success: false, error: chrome.runtime.lastError.message});
                return;
            }
            
            if (!dataUrl) {
                sendResponse({success: false, error: "Gagal mengambil screenshot"});
                return;
            }
            
            // Kirim gambar full screen, crop akan dilakukan di content script
            sendResponse({success: true, dataUrl: dataUrl, area: area});
        });
        
    } catch (error) {
        console.error('Error saat mengambil screenshot:', error);
        sendResponse({success: false, error: `Terjadi kesalahan: ${error.message}`});
    }
}

// Fungsi untuk menganalisis gambar dengan Gemini API
async function analyzeImageWithGemini(imageBase64, prompt, sendResponse) {
    try {
        const base64Data = imageBase64.split(',')[1];
        
        if (!GEMINI_API_KEY) {
            sendResponse({success: false, error: "API Key Gemini tidak ditemukan"});
            return;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: "image/png",
                                data: base64Data
                            }
                        }
                    ]
                }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 1000
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const answer = data.candidates[0].content.parts[0].text;
            sendResponse({success: true, answer: answer});
        } else {
            sendResponse({success: false, error: "Tidak ada respons dari Gemini API"});
        }
        
    } catch (error) {
        console.error('Error analyzing image:', error);
        sendResponse({success: false, error: error.message});
    }
}

// Fungsi untuk memanggil Gemini API (untuk text)
async function callGeminiAPI(text, sendResponse) {
    if (!GEMINI_API_KEY) {
        sendResponse({
            success: false,
            error: "API Key Gemini belum diatur. Silakan atur di halaman opsi ekstensi Taskly AI."
        });
        return;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: text }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const answer = data.candidates[0].content.parts[0].text;
            sendResponse({ success: true, answer: answer });
        } else {
            sendResponse({ success: false, error: "Tidak ada respons dari Gemini API." });
        }
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Fungsi untuk menyimpan API key
async function saveApiKey(apiKey, sendResponse) {
    try {
        await chrome.storage.sync.set({geminiApiKey: apiKey});
        GEMINI_API_KEY = apiKey;
        sendResponse({success: true});
    } catch (error) {
        sendResponse({success: false, error: error.message});
    }
}

// Fungsi untuk mengambil API key
async function getApiKeyForResponse(sendResponse) {
    try {
        const result = await chrome.storage.sync.get(['geminiApiKey']);
        sendResponse({success: true, apiKey: result.geminiApiKey || ''});
    } catch (error) {
        sendResponse({success: false, error: error.message});
    }
}

// Buka halaman opsi jika API key belum ada saat instalasi
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        chrome.storage.sync.get(['geminiApiKey'], function (result) {
            if (!result.geminiApiKey) {
                chrome.runtime.openOptionsPage();
            }
        });
    }
});