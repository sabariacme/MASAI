// EchoResearch API Controller

/* ==========================================
   State & Constants
   ========================================== */
const STATE = {
  apiKey: localStorage.getItem("gemini_music_api_key") || "",
  isLoading: false,
  lastResult: null,
  currentTopic: ""
};

const UI = {
  // Config / Drawer
  settingsBtn: document.getElementById("btn-settings"),
  configDrawer: document.getElementById("config-drawer"),
  apiKeyInput: document.getElementById("api-key-input"),
  saveKeyBtn: document.getElementById("save-key-btn"),
  apiKeyStatus: document.getElementById("api-key-status"),
  
  // Workspace Form
  researchForm: document.getElementById("research-form"),
  topicInput: document.getElementById("topic-input"),
  sourceToggle: document.getElementById("source-toggle"),
  sourceContainer: document.getElementById("source-container"),
  sourceInput: document.getElementById("source-input"),
  analysisType: document.getElementById("analysis-type"),
  toneSelect: document.getElementById("tone-select"),
  submitBtn: document.getElementById("submit-btn"),
  
  // Outputs & Panels
  placeholderPanel: document.getElementById("results-placeholder"),
  loadingPanel: document.getElementById("loading-container"),
  outputPanel: document.getElementById("output-workspace"),
  errorAlert: document.getElementById("error-alert"),
  errorMessage: document.getElementById("error-message"),
  
  // Result Selectors
  resultTopic: document.getElementById("result-topic"),
  resultTypeBadge: document.getElementById("result-type-badge"),
  keyPointsContainer: document.getElementById("key-points-container"),
  positiveHeader: document.getElementById("positive-header"),
  negativeHeader: document.getElementById("negative-header"),
  positiveList: document.getElementById("positive-list"),
  negativeList: document.getElementById("negative-list"),
  recommendationText: document.getElementById("recommendation-text"),
  actionableStepText: document.getElementById("actionable-step-text"),
  
  // Export Actions
  copyMarkdownBtn: document.getElementById("copy-markdown-btn"),
  copyJsonBtn: document.getElementById("copy-json-btn"),
  printReportBtn: document.getElementById("print-report-btn")
};

/* ==========================================
   Initialization
   ========================================== */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initUI();
    bindEvents();
  });
} else {
  initUI();
  bindEvents();
}

function initUI() {
  // Pre-fill API Key if stored
  if (STATE.apiKey) {
    UI.apiKeyInput.value = STATE.apiKey;
    updateKeyStatus(true);
  } else {
    // Force open drawer if key is missing to help user start
    toggleDrawer(true);
    updateKeyStatus(false);
  }

  // Pre-populate random topic examples in input placeholder
  const examples = [
    "Lo-fi beats for computer science students",
    "Binaural beats for high-stress workspaces",
    "Opportunities of video game soundscapes in ADHD therapy",
    "Ambient drone music for physical pain management",
    "Risks of aggressive lyricism in teen athletic performance"
  ];
  const randExample = examples[Math.floor(Math.random() * examples.length)];
  UI.topicInput.setAttribute("placeholder", `e.g. ${randExample}`);
}

function bindEvents() {
  // Toggle Settings Drawer
  UI.settingsBtn.addEventListener("click", () => toggleDrawer());
  
  // Save API Key
  UI.saveKeyBtn.addEventListener("click", saveApiKey);
  
  // Toggle Source/Context text area
  UI.sourceToggle.addEventListener("click", toggleSourceField);
  
  // Submit Form
  UI.researchForm.addEventListener("submit", handleResearchSubmit);
  
  // Export actions
  UI.copyMarkdownBtn.addEventListener("click", copyReportAsMarkdown);
  UI.copyJsonBtn.addEventListener("click", copyReportAsJson);
  UI.printReportBtn.addEventListener("click", () => window.print());
}

/* ==========================================
   UI Event Handlers & State Updates
   ========================================== */
function toggleDrawer(forceState = null) {
  const isOpen = UI.configDrawer.classList.contains("config-drawer-open");
  const nextState = forceState !== null ? forceState : !isOpen;
  
  if (nextState) {
    UI.configDrawer.classList.add("config-drawer-open");
    UI.settingsBtn.classList.add("active");
  } else {
    UI.configDrawer.classList.remove("config-drawer-open");
    UI.settingsBtn.classList.remove("active");
  }
}

function updateKeyStatus(hasKey) {
  if (hasKey) {
    UI.apiKeyStatus.innerHTML = `<span style="color: var(--color-pro); display: flex; align-items: center; gap: 4px; font-size: 0.8rem;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> API Key Configured</span>`;
  } else {
    UI.apiKeyStatus.innerHTML = `<span style="color: var(--color-con); display: flex; align-items: center; gap: 4px; font-size: 0.8rem;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> API Key Required</span>`;
  }
}

function saveApiKey() {
  const key = UI.apiKeyInput.value.trim();
  if (!key) {
    showError("Please enter a valid Gemini API Key.");
    return;
  }
  
  localStorage.setItem("gemini_music_api_key", key);
  STATE.apiKey = key;
  updateKeyStatus(true);
  hideError();
  
  // Toast notifications or flash button color as success
  UI.saveKeyBtn.innerHTML = "Saved!";
  UI.saveKeyBtn.style.background = "var(--color-pro)";
  setTimeout(() => {
    UI.saveKeyBtn.innerHTML = "Save Key";
    UI.saveKeyBtn.style.background = "";
    toggleDrawer(false); // auto-collapse
  }, 1000);
}

function toggleSourceField() {
  const isExpanded = UI.sourceContainer.classList.contains("expanded");
  if (isExpanded) {
    UI.sourceContainer.classList.remove("expanded");
    UI.sourceToggle.classList.remove("active");
  } else {
    UI.sourceContainer.classList.add("expanded");
    UI.sourceToggle.classList.add("active");
    UI.sourceInput.focus();
  }
}

function showError(msg) {
  UI.errorMessage.textContent = msg;
  UI.errorAlert.classList.add("active");
  UI.errorAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideError() {
  UI.errorAlert.classList.remove("active");
}

/* ==========================================
   Gemini API Integration & Prompt Engineering
   ========================================== */
async function handleResearchSubmit(e) {
  e.preventDefault();
  
  const topic = UI.topicInput.value.trim();
  const sourceContext = UI.sourceInput.value.trim();
  const type = UI.analysisType.value; // "pros-cons" or "opportunities-risks"
  const tone = UI.toneSelect.value; // "academic", "clinical", "practical", "creative"
  
  // Validations
  if (!STATE.apiKey) {
    showError("A Gemini API Key is required to summarize. Please enter it in the settings panel above.");
    toggleDrawer(true);
    return;
  }
  
  if (!topic) {
    showError("Please enter a music research topic to analyze.");
    UI.topicInput.focus();
    return;
  }
  
  hideError();
  setLoadingState(true);
  STATE.currentTopic = topic;

  try {
    const analysisResult = await fetchMusicAnalysis(topic, sourceContext, type, tone);
    renderResults(analysisResult);
    setLoadingState(false);
  } catch (error) {
    console.error("Gemini API Error:", error);
    showError(`Analysis failed: ${error.message || "Unknown error occurred"}. Please check your API key and network connection.`);
    setLoadingState(false);
  }
}

function setLoadingState(loading) {
  STATE.isLoading = loading;
  if (loading) {
    UI.submitBtn.disabled = true;
    UI.submitBtn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:6px;"><svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Researching...</span>`;
    
    // Switch workspaces panels
    UI.placeholderPanel.style.display = "none";
    UI.outputPanel.classList.remove("active");
    UI.loadingPanel.classList.add("active");
  } else {
    UI.submitBtn.disabled = false;
    UI.submitBtn.innerHTML = `Analyze Topic <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
    UI.loadingPanel.classList.remove("active");
  }
}

async function fetchMusicAnalysis(topic, sourceContext, comparisonType, tone) {
  // System Prompt for structured JSON schema response
  const systemInstruction = `You are a world-class Musicologist, Cognitive Neuroscientist, and Clinical Audiologist. 
Your goal is to conduct structured music research on the user's topic.
Your analysis must be grounded on the provided source/context if supplied by the user. If no context is provided, synthesize from peer-reviewed findings.

Format the output strictly as a JSON object matching this schema:
{
  "topic": "Refined title of the research topic",
  "keyPoints": [
    "First crucial insight about the topic, describing mechanisms or impacts (15-25 words)",
    "Second key scientific or artistic finding (15-25 words)",
    "Third insight on application or practical results (15-25 words)",
    "Fourth insight on psychological, physiological, or cultural mechanisms (15-25 words)",
    "Fifth insight summarizing the future or constraints of this research (15-25 words)"
  ],
  "comparisonType": "pros/cons" or "opportunities/risks" (must match "${comparisonType.replace('-', '/')}"),
  "comparison": [
    {
      "title": "Positive impact name (e.g. Auditory Entrainment)",
      "type": "positive",
      "description": "Elaborate on how/why this positive aspect operates, drawing from music-science references (30-50 words)"
    },
    {
      "title": "Second positive impact name",
      "type": "positive",
      "description": "Elaborate on this positive aspect (30-50 words)"
    },
    {
      "title": "Negative factor or risk name (e.g. Cognitive Fatigue)",
      "type": "negative",
      "description": "Elaborate on how/why this risk or negative effect manifests in this music usage context (30-50 words)"
    },
    {
      "title": "Second negative factor or risk name",
      "type": "negative",
      "description": "Elaborate on this negative factor or risk (30-50 words)"
    }
  ],
  "recommendation": {
    "summary": "Clear, synthesised final recommendation on the usage of music for this topic, detailing optimal conditions (30-50 words)",
    "actionableStep": "A highly specific, concrete actionable protocol for the user to try (e.g. Listen to 60-80 BPM music at 50dB) (15-25 words)"
  }
}

Critical Instructions:
- Adhere strictly to the requested tone: "${tone}". E.g. Academic should feel formal and citation-ready. Clinical should focus on physiological/psychological therapy outcomes. Practical should focus on daily life optimizations. Creative should explore artistic and sonic dimensions.
- The return format MUST be raw JSON. Do NOT wrap the JSON in Markdown code blocks (e.g. \`\`\`json ... \`\`\`).
- Ensure there are EXACTLY 5 keyPoints, EXACTLY 2 positive comparisons, and EXACTLY 2 negative comparisons.
- ground your insights deeply on the user's provided context/source text if it exists. Highlight terms, quotes or metrics mentioned in it.`;

  // Construct query
  let userPrompt = `Topic: "${topic}"\n`;
  if (sourceContext) {
    userPrompt += `Grounding Source Text:\n"""\n${sourceContext}\n"""\n`;
  }
  userPrompt += `Analyze this topic according to the system rules and output JSON.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${STATE.apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: userPrompt }
        ]
      }
    ],
    system_instruction: {
      parts: [
        { text: systemInstruction }
      ]
    },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const responseData = await response.json();
  const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!responseText) {
    throw new Error("No response content returned from Gemini API.");
  }
  
  // Parse and return
  try {
    return JSON.parse(responseText.trim());
  } catch (parseError) {
    console.error("JSON parsing error. Raw response was:", responseText);
    throw new Error("The API responded with invalid JSON format. Please try again.");
  }
}

/* ==========================================
   Renderer / UI Builders
   ========================================== */
function renderResults(data) {
  STATE.lastResult = data;
  
  // Set headers
  UI.resultTopic.textContent = data.topic;
  
  // Format comparison badge
  const displayType = data.comparisonType === "pros/cons" ? "Pros & Cons" : "Opportunities & Risks";
  UI.resultTypeBadge.textContent = displayType;
  
  // Render 5 Key Points
  UI.keyPointsContainer.innerHTML = "";
  data.keyPoints.forEach((point, index) => {
    const card = document.createElement("div");
    card.className = "key-point-card";
    card.innerHTML = `
      <span class="key-point-num">${(index + 1).toString().padStart(2, '0')}</span>
      <p class="key-point-text">${point}</p>
    `;
    UI.keyPointsContainer.appendChild(card);
  });
  
  // Render Comparative Columns
  // Setup headers
  if (data.comparisonType === "pros/cons") {
    UI.positiveHeader.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Key Pros / Benefits`;
    UI.negativeHeader.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Key Cons / Drawbacks`;
  } else {
    UI.positiveHeader.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Opportunities & Potential`;
    UI.negativeHeader.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Risks & Limitations`;
  }
  
  // Split lists
  UI.positiveList.innerHTML = "";
  UI.negativeList.innerHTML = "";
  
  const positiveItems = data.comparison.filter(item => item.type === "positive" || item.type.toLowerCase().includes("pro") || item.type.toLowerCase().includes("opportunity"));
  const negativeItems = data.comparison.filter(item => item.type === "negative" || item.type.toLowerCase().includes("con") || item.type.toLowerCase().includes("risk"));
  
  positiveItems.forEach(item => {
    const li = document.createElement("li");
    li.className = "column-item";
    li.innerHTML = `
      <div class="item-bullet">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      <div class="item-content">
        <strong>${item.title}</strong>
        <span>${item.description}</span>
      </div>
    `;
    UI.positiveList.appendChild(li);
  });
  
  negativeItems.forEach(item => {
    const li = document.createElement("li");
    li.className = "column-item";
    li.innerHTML = `
      <div class="item-bullet">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </div>
      <div class="item-content">
        <strong>${item.title}</strong>
        <span>${item.description}</span>
      </div>
    `;
    UI.negativeList.appendChild(li);
  });
  
  // Render Recommendation
  UI.recommendationText.textContent = data.recommendation.summary;
  UI.actionableStepText.textContent = data.recommendation.actionableStep;
  
  // Toggle output visibility
  UI.outputPanel.classList.add("active");
  
  // Smooth scroll to output
  UI.outputPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ==========================================
   Exports utilities
   ========================================== */
function copyReportAsMarkdown() {
  if (!STATE.lastResult) return;
  const d = STATE.lastResult;
  
  let md = `# Music Research Report: ${d.topic}\n\n`;
  
  md += `## 5 Key Insights\n`;
  d.keyPoints.forEach((p, i) => {
    md += `${i + 1}. ${p}\n`;
  });
  md += `\n`;
  
  const displayType = d.comparisonType === "pros/cons" ? "Pros & Cons" : "Opportunities & Risks";
  md += `## Analysis (${displayType})\n\n`;
  
  const positiveTitle = d.comparisonType === "pros/cons" ? "Benefits / Pros" : "Opportunities";
  const negativeTitle = d.comparisonType === "pros/cons" ? "Drawbacks / Cons" : "Risks";
  
  md += `### ${positiveTitle}\n`;
  const positiveItems = d.comparison.filter(item => item.type === "positive" || item.type.toLowerCase().includes("pro") || item.type.toLowerCase().includes("opportunity"));
  positiveItems.forEach(item => {
    md += `- **${item.title}**: ${item.description}\n`;
  });
  md += `\n`;
  
  md += `### ${negativeTitle}\n`;
  const negativeItems = d.comparison.filter(item => item.type === "negative" || item.type.toLowerCase().includes("con") || item.type.toLowerCase().includes("risk"));
  negativeItems.forEach(item => {
    md += `- **${item.title}**: ${item.description}\n`;
  });
  md += `\n`;
  
  md += `## Recommendation\n`;
  md += `${d.recommendation.summary}\n\n`;
  md += `**Actionable Protocol**: ${d.recommendation.actionableStep}\n\n`;
  md += `*Generated via Music Research AI on ${new Date().toLocaleDateString()}*`;
  
  copyToClipboard(md, UI.copyMarkdownBtn, "Markdown Copied!");
}

function copyReportAsJson() {
  if (!STATE.lastResult) return;
  const jsonStr = JSON.stringify(STATE.lastResult, null, 2);
  copyToClipboard(jsonStr, UI.copyJsonBtn, "JSON Copied!");
}

function copyToClipboard(text, buttonElement, successMsg) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = buttonElement.innerHTML;
    buttonElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> ${successMsg}`;
    buttonElement.style.borderColor = "var(--color-pro)";
    buttonElement.style.color = "var(--color-pro)";
    
    setTimeout(() => {
      buttonElement.innerHTML = originalText;
      buttonElement.style.borderColor = "";
      buttonElement.style.color = "";
    }, 2000);
  }).catch(err => {
    console.error("Failed to copy clipboard:", err);
    alert("Could not copy to clipboard. Please copy text manually.");
  });
}
