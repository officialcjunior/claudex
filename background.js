// Inject the content script when the extension is installed or updated
browser.runtime.onInstalled.addListener(() => {
    browser.tabs.query({active: true, currentWindow: true})
      .then((tabs) => {
        if (tabs[0]) {
          browser.tabs.executeScript(tabs[0].id, {
            file: "/content_scripts/exporter.js"
          });
        }
      })
      .catch((error) => console.error(`Error injecting script: ${error}`));
  });
  

// Inject the content script when a tab is updated
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    browser.tabs.executeScript(tabId, {
      file: "/content_scripts/exporter.js"
    }).catch((error) => console.error(`Error injecting script: ${error}`));
  }
});
