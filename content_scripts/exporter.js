//(() => {
    function getConversationElements() {
        const container = document.querySelector("div.flex-1.flex.flex-col.gap-3.px-4.pt-1");
        const menuButton = document.querySelector("button[data-testid='chat-menu-trigger']");
        const title = menuButton ? menuButton.textContent : "";
        return {
            elements: container.querySelectorAll("div.font-claude-message, div.font-user-message"),
            title: title
        };
    };

    function  getCurrentDateTime ()  {
        return new Date().toISOString().slice(0, 19).replace("T", " ");
    };
    function  parseOrderedList  (ol)  {
        let items = [];
        let start = ol.getAttribute("start");
        let index = start ? parseInt(start) : 0;

        ol.childNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "LI") {
                if (start) {
                    let itemIndex = node.getAttribute("index") || "0";
                    index = start + parseInt(itemIndex);
                } else {
                    index++;
                }
                items.push([index, node.textContent]);
            }
        });

        return items;
    };

    function convertToMarkdown (element, markdown) {
        const contentNodes = element.childNodes;

        for (const node of contentNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                markdown += `${node.textContent}\n`;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName;
                const content = node.textContent;

                switch (tagName) {
                    case "P":
                        markdown += `${content}\n`;
                        break;
                    case "OL":
                        for (const [index, item] of parseOrderedList(node)) {
                            markdown += `${index}. ${item}\n`;
                        }
                        break;
                    case "UL":
                        node.childNodes.forEach(li => {
                            if (li.nodeType === Node.ELEMENT_NODE && li.tagName === "LI") {
                                markdown += `- ${li.textContent}\n`;
                            }
                        });
                        break;
                    case "PRE":
                        const preChildren = node.childNodes.length === 1 ? node.childNodes[0].childNodes : node.childNodes;
                        const language = preChildren[0].textContent.trim();
                        const code = preChildren[2].textContent.trim();
                        markdown += `\`\`\`${language}\n${code}\n\`\`\`\n`;
                        break;
                    case "BLOCKQUOTE":
                        content.trim().split("\n").forEach(line => {
                            markdown += `> ${line}\n`;
                        });
                        break;
                    case "TABLE":
                        markdown += convertTableToMarkdown(node);
                        break;
                }
                markdown += "\n";
            }
        }

        return markdown;
    };

    function convertTableToMarkdown (tableElement) {
        let tableMarkdown = "";

        tableElement.childNodes.forEach(section => {
            if (section.nodeType === Node.ELEMENT_NODE && (section.tagName === "THEAD" || section.tagName === "TBODY")) {
                let sectionMarkdown = "";
                let columnCount = 0;

                section.childNodes.forEach(row => {
                    if (row.nodeType === Node.ELEMENT_NODE && row.tagName === "TR") {
                        let rowMarkdown = "";
                        row.childNodes.forEach(cell => {
                            if (cell.nodeType === Node.ELEMENT_NODE && (cell.tagName === "TD" || cell.tagName === "TH")) {
                                rowMarkdown += `| ${cell.textContent} `;
                                if (section.tagName === "THEAD") columnCount++;
                            }
                        });
                        sectionMarkdown += `${rowMarkdown}|\n`;
                    }
                });

                tableMarkdown += sectionMarkdown;

                if (section.tagName === "THEAD") {
                    const separator = `| ${Array(columnCount).fill("---").join(" | ")} |\n`;
                    tableMarkdown += separator;
                }
            }
        });

        return tableMarkdown;
    };

    async function getCodeBlockContent (element, markdown) {
        const codeBlocks = element.nextSibling.getElementsByTagName("pre");

        for (let i = 0; i < codeBlocks.length; i++) {
            await new Promise((resolve) => {
                const codeBlock = codeBlocks[i].innerText.trimEnd();
                markdown += codeBlock + "\n";
                resolve();
            });
        }
    
        return markdown;
    };
    
    
    async function exportConversation() {
        let markdown = "";
        const { elements, title } = getConversationElements();
        const dateTime = getCurrentDateTime();
        markdown += `# ${title || "Claude Chat"}\nTime of export: \`${dateTime}\`\n\n`;
        markdown += "---\n";
        for (const element of elements) {

            if (!element.firstChild) continue;
            if (element.firstChild.nodeType === Node.TEXT_NODE) {
                markdown += "\n";
                continue;
            }
            if (element.classList.contains("font-claude-message")) {
                markdown += "## Claude:\n";
                markdown += await getCodeBlockContent(element, markdown);
                //markdown += convertToMarkdown(element, "");
                markdown += "---\n";
            } else {
                markdown += "## Me:\n";
                markdown += convertToMarkdown(element, "");
                markdown += "---\n";
            }
        }
        console.save(markdown);
        return markdown;
    }
    // Add save method to console
    console.save = function(content) {
        const menuButton = document.querySelector("button[data-testid='chat-menu-trigger']");
        const title = menuButton ? menuButton.textContent : "";
        const blob = new Blob([content], { type: "text/plain" });
        const filename = `Claude chat - ${(title || "chat").trim().toLowerCase().replace(/^[^\w\d]+|[^\w\d]+$/g, "").replace(/[\s\W-]+/g, "-")}.md`;
        const link = document.createElement("a");
        link.download = filename;
        link.href = window.URL.createObjectURL(blob);
        link.dataset.downloadurl = ["text/plain", link.download, link.href].join(":");
        const event = new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: false
        });
        link.dispatchEvent(event);
    };

// })();
// Listen for messages from the popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "export") {
        try {
            const markdown = exportConversation();
            sendResponse({ success: true, markdown: markdown });
        } catch (error) {
            sendResponse({ success: false, error: error.toString() });
        }
    }
    return true; // Indicates an asynchronous response
});

console.log("Exporter content script loaded");