document.getElementById('exportButton').addEventListener('click', () => {
    browser.tabs.query({active: true, currentWindow: true})
      .then(tabs => {
        browser.tabs.sendMessage(tabs[0].id, {command: "ping"})
          .then(response => {
            if (response && response.pong) {
              // Content script is ready, send the export command
              return browser.tabs.sendMessage(tabs[0].id, {command: "export"});
            } else {
              throw new Error("Content script not ready");
            }
          })
          .catch(error => {
            console.error(`Error: ${error}`);
            // If content script is not ready, try injecting it
            return browser.tabs.executeScript(tabs[0].id, {
              file: "/content_scripts/exporter.js"
            }).then(() => {
              // After injection, try sending the export command again
              return browser.tabs.sendMessage(tabs[0].id, {command: "export"});
            });
          });
      })
      .catch(error => console.error(`Error: ${error}`));
  });