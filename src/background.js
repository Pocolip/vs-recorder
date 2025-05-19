// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // Open the extension page in a new tab
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  });
});

// Log when background script loads
console.log('VS Recorder background script loaded');