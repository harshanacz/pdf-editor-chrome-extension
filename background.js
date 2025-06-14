// Detect when PDF is opened in a tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url.toLowerCase().endsWith('.pdf')) {
    // If the URL ends with .pdf, we'll inject our editor
    chrome.tabs.executeScript(tabId, {
      file: 'content.js'
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openEditor') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('editor/editor.html') + '?pdf=' + encodeURIComponent(request.pdfUrl)
    });
  }
});