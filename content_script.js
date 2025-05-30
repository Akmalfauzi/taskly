// Guard to prevent multiple injections
if (typeof window.tasklyContentScriptLoaded === 'undefined') {
    window.tasklyContentScriptLoaded = true;

    // Deklarasi variabel global
    let tasklyTooltip = null;
    let tasklyResultBox = null;
    let currentSelection = null;
    let isSelectingArea = false;
    let selectionOverlay = null;
    let selectionBox = null;
    let startX, startY;

    console.log("Taskly content script loaded");

    // Tambahkan message listener untuk popup commands
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("Content script received message:", request);
        
        try {
            switch(request.action) {
                case "startAreaSelection":
                    console.log("Starting area selection from popup");
                    startAreaSelectionMode();
                    sendResponse({success: true, message: "Area selection started"});
                    break;
                default:
                    sendResponse({success: false, error: "Unknown action"});
            }
        } catch (error) {
            console.error("Error handling message:", error);
            sendResponse({success: false, error: error.message});
        }
        
        return true; // Keep message channel open for async response
    });

    // Fungsi untuk memulai mode seleksi area
    function startAreaSelectionMode() {
        console.log("Starting area selection mode");
        
        if (isSelectingArea) {
            console.log("Already in selection mode");
            return;
        }
        
        isSelectingArea = true;
        
        // Hapus elemen yang ada
        removeTasklyIcon();
        removeResultBox();
        
        // Buat overlay untuk seleksi
        createSelectionOverlay();
        
        // Tambahkan event listeners
        document.addEventListener('mousedown', startSelection);
        document.addEventListener('mousemove', updateSelection);
        document.addEventListener('mouseup', endSelection);
        document.addEventListener('keydown', cancelSelection);
        
        // Ubah cursor
        document.body.style.cursor = 'crosshair';
        
        console.log("Selection mode activated");
    }

    // Fungsi untuk membuat overlay seleksi
    function createSelectionOverlay() {
        if (selectionOverlay) {
            document.body.removeChild(selectionOverlay);
        }
        
        selectionOverlay = document.createElement('div');
        selectionOverlay.id = 'taskly-selection-overlay';
        selectionOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.1);
            z-index: 999999;
            pointer-events: none;
            user-select: none;
        `;
        
        document.body.appendChild(selectionOverlay);
        
        // Buat selection box
        selectionBox = document.createElement('div');
        selectionBox.id = 'taskly-selection-box';
        selectionBox.style.cssText = `
            position: fixed;
            border: 2px dashed #4CAF50;
            background: rgba(76, 175, 80, 0.1);
            display: none;
            z-index: 1000000;
            pointer-events: none;
            user-select: none;
        `;
        
        document.body.appendChild(selectionBox);
        
        // Tambahkan instruksi
        const instruction = document.createElement('div');
        instruction.id = 'taskly-instruction';
        instruction.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 1000001;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        instruction.textContent = 'Drag to select area for screenshot. Press ESC to cancel.';
        
        document.body.appendChild(instruction);
    }

    // Event handlers untuk drag selection
    function startSelection(e) {
        if (!isSelectingArea) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        startX = e.clientX;
        startY = e.clientY;
        
        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.style.display = 'block';
        
        console.log("Selection started at:", startX, startY);
    }

    function updateSelection(e) {
        if (!isSelectingArea || !selectionBox || selectionBox.style.display === 'none') return;
        
        e.preventDefault();
        
        const currentX = e.clientX;
        const currentY = e.clientY;
        
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        
        selectionBox.style.left = left + 'px';
        selectionBox.style.top = top + 'px';
        selectionBox.style.width = width + 'px';
        selectionBox.style.height = height + 'px';
    }

    function endSelection(e) {
        if (!isSelectingArea) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const endX = e.clientX;
        const endY = e.clientY;
        
        const left = Math.min(startX, endX);
        const top = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);
        
        console.log("Selection ended:", {left, top, width, height});
        
        // Minimum size check
        if (width > 10 && height > 10) {
            captureSelectedArea(left, top, width, height);
        } else {
            console.log("Selection too small, cancelling");
            cancelAreaSelection();
        }
    }

    function cancelSelection(e) {
        if (e.key === 'Escape') {
            console.log("Selection cancelled by ESC");
            cancelAreaSelection();
        }
    }

    // Fungsi untuk capture area yang dipilih
    function captureSelectedArea(left, top, width, height) {
        console.log("Capturing area:", {left, top, width, height});
        
        // Cleanup selection UI
        cleanupSelection();
        
        // Get device pixel ratio for high DPI displays
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Calculate the actual coordinates in the screenshot
        const captureData = {
            left: Math.round(left * devicePixelRatio),
            top: Math.round(top * devicePixelRatio),
            width: Math.round(width * devicePixelRatio),
            height: Math.round(height * devicePixelRatio)
        };
        
        // Send message to background script to capture
        chrome.runtime.sendMessage({
            action: "captureVisibleTab",
            coordinates: captureData
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending capture message:", chrome.runtime.lastError);
                alert("Failed to capture screenshot: " + chrome.runtime.lastError.message);
            } else if (response && response.success) {
                console.log("Screenshot captured successfully");
                showScreenshotPopup(response.dataUrl, response.coordinates);
            } else {
                console.error("Capture failed:", response);
                alert("Failed to capture screenshot");
            }
        });
    }

    // Fungsi untuk menampilkan popup screenshot
    function showScreenshotPopup(dataUrl, coordinates) {
        // Remove any existing popup
        const existingPopup = document.getElementById('taskly-screenshot-popup');
        if (existingPopup) {
            document.body.removeChild(existingPopup);
        }

        // Create close button first
        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        closeButton.style.cssText = `
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(0, 0, 0, 0.1);
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: #666;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000002;
            transition: all 0.2s ease;
        `;
        closeButton.onmouseover = () => {
            closeButton.style.background = 'rgba(0, 0, 0, 0.2)';
            closeButton.style.color = '#333';
        };
        closeButton.onmouseout = () => {
            closeButton.style.background = 'rgba(0, 0, 0, 0.1)';
            closeButton.style.color = '#666';
        };
        closeButton.onclick = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(popup);
        };

        // Create popup container with adjusted padding
        const popup = document.createElement('div');
        popup.id = 'taskly-screenshot-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            z-index: 1000000;
            max-width: 90vw;
            max-height: 90vh;
            overflow: auto;
            display: flex;
            flex-direction: column;
            gap: 20px;
        `;

        // Create image element
        const img = document.createElement('img');
        img.style.cssText = `
            max-width: 100%;
            height: auto;
            display: block;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin-top: 2rem;
        `;

        // Create loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-top: 10px;
        `;
        loadingDiv.innerHTML = `
            <div style="
                width: 30px;
                height: 30px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #4CAF50;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 10px;
            "></div>
            <span style="color: #666;">Analyzing screenshot...</span>
        `;

        // Add overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999999;
        `;
        overlay.onclick = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(popup);
        };

        // Add elements to popup
        popup.appendChild(closeButton);
        popup.appendChild(loadingDiv);

        // Add popup and overlay to page
        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        // Load and crop the image
        const tempImg = new Image();
        tempImg.onload = () => {
            // Create canvas for cropping
            const canvas = document.createElement('canvas');
            canvas.width = coordinates.width;
            canvas.height = coordinates.height;
            const ctx = canvas.getContext('2d');

            // Draw the cropped portion
            ctx.drawImage(
                tempImg,
                coordinates.left,
                coordinates.top,
                coordinates.width,
                coordinates.height,
                0,
                0,
                coordinates.width,
                coordinates.height
            );

            // Set the cropped image
            img.src = canvas.toDataURL('image/png');
            popup.insertBefore(img, loadingDiv);

            // Automatically analyze the screenshot
            chrome.runtime.sendMessage({
                type: "ANALYZE_IMAGE_WITH_GEMINI",
                imageBase64: canvas.toDataURL('image/png'),
                prompt: "Analisis screenshot ini dan berikan jawaban dalam format berikut:\n1. Jawaban: [jawaban singkat dalam satu kalimat]\n2. Penjelasan: [penjelasan singkat 1-2 kalimat]\n\nGunakan bahasa Indonesia yang mudah dipahami."
            }, (response) => {
                // Remove loading indicator
                popup.removeChild(loadingDiv);

                if (response && response.success) {
                    // Create result container
                    const resultContainer = document.createElement('div');
                    resultContainer.style.cssText = `
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 8px;
                        margin-top: 10px;
                    `;

                    // Add markdown styles
                    const style = document.createElement('style');
                    style.textContent = `
                        .markdown-content {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .markdown-content p {
                            margin-bottom: 1em;
                            font-size: 16px;
                        }
                        .markdown-content strong {
                            color: #2c3e50;
                            font-weight: 600;
                        }
                        .markdown-content ol {
                            margin: 1em 0;
                            padding-left: 1.5em;
                        }
                        .markdown-content li {
                            margin-bottom: 0.5em;
                        }
                    `;
                    document.head.appendChild(style);

                    // Use marked directly since it's already loaded via content_scripts
                    resultContainer.innerHTML = `
                        <div class="markdown-content">
                            ${marked.parse(response.answer)}
                        </div>
                    `;

                    popup.appendChild(resultContainer);
                } else {
                    const errorDiv = document.createElement('div');
                    errorDiv.style.cssText = `
                        background: #fee;
                        color: #c00;
                        padding: 15px;
                        border-radius: 8px;
                        margin-top: 10px;
                    `;
                    errorDiv.textContent = "Gagal menganalisis gambar: " + (response?.error || "Terjadi kesalahan");
                    popup.appendChild(errorDiv);
                }
            });
        };
        tempImg.src = dataUrl;
    }

    // Fungsi untuk cancel area selection
    function cancelAreaSelection() {
        cleanupSelection();
    }

    // Fungsi untuk cleanup selection UI
    function cleanupSelection() {
        isSelectingArea = false;
        
        // Remove event listeners
        document.removeEventListener('mousedown', startSelection);
        document.removeEventListener('mousemove', updateSelection);
        document.removeEventListener('mouseup', endSelection);
        document.removeEventListener('keydown', cancelSelection);
        
        // Restore cursor
        document.body.style.cursor = '';
        
        // Remove UI elements
        if (selectionOverlay) {
            document.body.removeChild(selectionOverlay);
            selectionOverlay = null;
        }
        
        if (selectionBox) {
            document.body.removeChild(selectionBox);
            selectionBox = null;
        }
        
        const instruction = document.getElementById('taskly-instruction');
        if (instruction) {
            document.body.removeChild(instruction);
        }
        
        console.log("Selection cleanup completed");
    }

    // Fungsi untuk show success message
    function showSuccessMessage() {
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            z-index: 1000001;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        successMsg.textContent = '✓ Screenshot captured successfully!';
        
        document.body.appendChild(successMsg);
        
        setTimeout(() => {
            if (document.body.contains(successMsg)) {
                document.body.removeChild(successMsg);
            }
        }, 3000);
    }

    // Fungsi utility lainnya...
    function removeTasklyIcon() {
        if (tasklyTooltip) {
            document.body.removeChild(tasklyTooltip);
            tasklyTooltip = null;
        }
    }

    function removeResultBox() {
        if (tasklyResultBox) {
            document.body.removeChild(tasklyResultBox);
            tasklyResultBox = null;
        }
        
        const loadingBox = document.getElementById('taskly-loading-box');
        if (loadingBox) {
            document.body.removeChild(loadingBox);
        }
    }

    console.log("Taskly content script initialization completed");
}