console.log("Email Writer Extension - content script loaded");

// Create AI Reply Button
function createAIButton() {
    const button = document.createElement("button");
    button.className = "T-I J-J5-Ji aoO v7 T-I-atl L3 ai-reply-button";
    button.style.marginRight = "0"; // handled in container
    button.textContent = "AI Reply";
    button.setAttribute("role", "button");
    button.setAttribute("data-tooltip", "Generate AI Reply");
    return button;
}

// Create Tone Selector
function createToneSelector() {
    const select = document.createElement("select");
    select.className = "ai-tone-selector";
    
    // Match Gmail button styling
    select.style.height = "30px";
    select.style.marginLeft = "6px";
    select.style.padding = "0 6px";
    select.style.border = "1px solid #dadce0";
    select.style.borderRadius = "4px";
    select.style.fontSize = "13px";
    select.style.color = "#202124";
    select.style.background = "#fff";
    select.style.cursor = "pointer";

    const tones = ["professional", "friendly", "casual", "formal", "concise"];
    tones.forEach((tone) => {
        const option = document.createElement("option");
        option.value = tone;
        option.textContent = tone.charAt(0).toUpperCase() + tone.slice(1);
        if (tone === "friendly") option.selected = true; // Default tone
        select.appendChild(option);
    });

    return select;
}

// Get Email Content
function getEmailContent() {
    const selectors = [
        ".h7",
        ".a3s.aiL",
        ".gmail_quote",
        "[role='presentation']"
    ];
    for (const selector of selectors) {
        const content = document.querySelector(selector);
        if (content && content.innerText) {
            return content.innerText.trim();
        }
    }
    return "";
}

// Find Gmail Compose Toolbar
function findComposeToolbar() {
    const selectors = [
        ".btC",
        ".aDh",
        "[role='toolbar']",
        ".gU.Up"
    ];
    for (const selector of selectors) {
        const toolbar = document.querySelector(selector);
        if (toolbar instanceof HTMLElement) {
            return toolbar;
        }
    }
    return null;
}

// Inject AI Button + Tone Selector into Toolbar
function injectButton() {
    // Remove old button & selector if already exist
    const existingButton = document.querySelector(".ai-reply-button");
    const existingSelector = document.querySelector(".ai-tone-selector");
    if (existingButton) existingButton.remove();
    if (existingSelector) existingSelector.remove();

    const toolbar = findComposeToolbar();
    console.log("Toolbar found:", toolbar, "Type:", toolbar?.constructor?.name);

    if (!toolbar || !(toolbar instanceof HTMLElement)) {
        console.warn("Toolbar not found or invalid:", toolbar);
        return;
    }

    // Avoid duplicates
    if (toolbar.querySelector(".ai-reply-container")) return;

    // Container to keep them aligned
    const container = document.createElement("div");
    container.className = "ai-reply-container";
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.marginRight = "8px";

    const button = createAIButton();
    const toneSelector = createToneSelector();

    // Button logic
    button.addEventListener("click", async () => {
        try {
            button.textContent = "Generating...";
            button.disabled = true;

            const emailContent = getEmailContent();
            const selectedTone = toneSelector.value;

            const response = await fetch("http://localhost:8081/api/email/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emailContent, tone: selectedTone }),
            });

            if (!response.ok) throw new Error("API Request Failed");

            const generatedReply = await response.text();

            //  compose box detection
            const dialog = toolbar.closest('[role="dialog"]');
            let composeBox = dialog?.querySelector('[role="textbox"]');

            if (!composeBox) {
                composeBox = document.querySelector(".Am.Al.editable[role='textbox']");
            }
            if (!composeBox) {
                composeBox = document.querySelector("[aria-label='Message Body']");
            }

            if (composeBox) {
                composeBox.focus();
                document.execCommand("insertText", false, generatedReply);
            } else {
                console.error("Compose box was not found with any selector");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to generate reply");
        } finally {
            button.textContent = "AI Reply";
            button.disabled = false;
        }
    });

    // Append elements
    container.appendChild(button);
    container.appendChild(toneSelector);

    toolbar.insertBefore(container, toolbar.firstChild);
}

// Observe Gmail for Compose Windows
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        const addedNodes = Array.from(mutation.addedNodes);

        const hasComposeElements = addedNodes.some(
            (node) =>
                node.nodeType === Node.ELEMENT_NODE &&
                (
                    (node.matches && node.matches(".aDh, .btC, [role='dialog']")) ||
                    (node.querySelector && node.querySelector(".aDh, .btC, [role='dialog']"))
                )
        );

        if (hasComposeElements) {
            console.log("Compose Window Detected");
            setTimeout(injectButton, 500);
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });
