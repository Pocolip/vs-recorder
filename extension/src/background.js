// Extension background script

// Handle extension installation and startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('VS Recorder extension installed/updated');

  if (details.reason === 'install') {
    console.log('First time installation - initializing storage');
    // Storage will be initialized when the popup/page loads
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('VS Recorder extension started');
});

// Handle action click (extension icon click)
chrome.action.onClicked.addListener((tab) => {
  // Open the extension page instead of popup
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  });
});

// Handle context menu creation (for future implementation)
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for Pokepaste links
  chrome.contextMenus.create({
    id: 'import-pokepaste',
    title: 'Import team with VS Recorder',
    contexts: ['link'],
    targetUrlPatterns: ['*://pokepast.es/*']
  });

  // Create context menu for Showdown replay links
  chrome.contextMenus.create({
    id: 'import-replay',
    title: 'Add replay to VS Recorder',
    contexts: ['link'],
    targetUrlPatterns: ['*://replay.pokemonshowdown.com/*']
  });
});

// Handle context menu clicks (for future implementation)
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'import-pokepaste':
      console.log('Import Pokepaste:', info.linkUrl);
      // TODO: Implement Pokepaste import
      break;
    case 'import-replay':
      console.log('Import replay:', info.linkUrl);
      // TODO: Implement replay import
      break;
  }
});

// Handle messages from content scripts (for future implementation)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'POKEPASTE_DETECTED':
      console.log('Pokepaste detected:', request.url);
      // TODO: Handle Pokepaste detection
      sendResponse({ success: true });
      break;
    case 'REPLAY_DETECTED':
      console.log('Showdown replay detected:', request.url);
      // TODO: Handle replay detection
      sendResponse({ success: true });
      break;
    default:
      console.log('Unknown message type:', request.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  // Return true to indicate we'll send a response asynchronously
  return true;
});

// Storage quota monitoring (optional)
chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
  console.log('Storage bytes in use:', bytesInUse);

  // Warn if storage is getting full (approaching 5MB limit)
  if (bytesInUse > 4 * 1024 * 1024) {
    console.warn('Storage usage is high:', bytesInUse, 'bytes');
  }
});