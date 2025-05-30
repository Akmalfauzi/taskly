document.addEventListener('DOMContentLoaded', function () {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyButton = document.getElementById('saveApiKeyButton');
    const statusMessage = document.getElementById('statusMessage');

    // Muat API Key yang tersimpan saat halaman opsi dibuka
    chrome.storage.sync.get(['geminiApiKey'], function (result) {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
    });

    // Simpan API Key
    saveApiKeyButton.addEventListener('click', function () {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ geminiApiKey: apiKey }, function () {
                statusMessage.textContent = 'API Key berhasil disimpan!';
                statusMessage.style.color = 'green';
                console.log('API Key disimpan.');
                setTimeout(() => statusMessage.textContent = '', 3000);
            });
        } else {
            statusMessage.textContent = 'API Key tidak boleh kosong.';
            statusMessage.style.color = 'red';
        }
    });
});