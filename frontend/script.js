const API = "http://127.0.0.1:8000";

const elements = {
  apiStatus: document.getElementById("apiStatus"),
  apiStatusText: document.getElementById("apiStatusText"),
  uploadForm: document.getElementById("uploadForm"),
  fileInput: document.getElementById("pdfFile"),
  dropZone: document.getElementById("dropZone"),
  selectedFile: document.getElementById("selectedFile"),
  selectedFileName: document.getElementById("selectedFileName"),
  selectedFileSize: document.getElementById("selectedFileSize"),
  removeFile: document.getElementById("removeFile"),
  uploadButton: document.getElementById("uploadButton"),
  uploadButtonText: document.getElementById("uploadButtonText"),
  uploadStatus: document.getElementById("uploadStatus"),
  indexedCard: document.getElementById("indexedCard"),
  indexedSummary: document.getElementById("indexedSummary"),
  indexedCount: document.getElementById("indexedCount"),
  chatForm: document.getElementById("chatForm"),
  question: document.getElementById("question"),
  sendButton: document.getElementById("sendButton"),
  welcomeMessage: document.getElementById("welcomeMessage"),
  messages: document.getElementById("messages"),
  thinkingRow: document.getElementById("thinkingRow"),
  conversation: document.getElementById("conversation"),
};

function formatBytes(bytes) {
  if (!bytes) return "0 bytes";
  const units = ["bytes", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / 1024 ** unitIndex;
  return `${amount.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function setUploadStatus(message, tone = "") {
  elements.uploadStatus.textContent = message;
  elements.uploadStatus.dataset.tone = tone;
}

function setSelectedFile(file) {
  const isPdf = file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
  if (file && !isPdf) {
    elements.fileInput.value = "";
    elements.selectedFile.hidden = true;
    elements.uploadButton.disabled = true;
    elements.uploadButtonText.textContent = "Select a PDF to continue";
    setUploadStatus("Please choose a PDF document.", "error");
    return;
  }

  if (!file) {
    elements.fileInput.value = "";
    elements.selectedFile.hidden = true;
    elements.uploadButton.disabled = true;
    elements.uploadButtonText.textContent = "Select a PDF to continue";
    setUploadStatus("");
    return;
  }

  elements.selectedFileName.textContent = file.name;
  elements.selectedFileSize.textContent = formatBytes(file.size);
  elements.selectedFile.hidden = false;
  elements.uploadButton.disabled = false;
  elements.uploadButtonText.textContent = "Upload and index document";
  setUploadStatus("");
}

function setBusy(button, busy) {
  button.classList.toggle("is-busy", busy);
  button.disabled = busy || (button === elements.uploadButton && !elements.fileInput.files[0]);
}

async function readResponse(response) {
  let data = {};
  try {
    data = await response.json();
  } catch {
    // The API may return a plain error page when it is unavailable or misconfigured.
  }

  if (!response.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).filter(Boolean).join(" ")
      : detail;
    throw new Error(message || `Request failed (${response.status}).`);
  }
  return data;
}

async function checkConnection() {
  try {
    const response = await fetch(`${API}/health`, { cache: "no-store" });
    if (!response.ok) throw new Error("API is unavailable");
    elements.apiStatus.dataset.state = "online";
    elements.apiStatusText.textContent = "API connected";
  } catch {
    elements.apiStatus.dataset.state = "offline";
    elements.apiStatusText.textContent = "API unavailable";
  }
}

elements.fileInput.addEventListener("change", () => setSelectedFile(elements.fileInput.files[0]));
elements.removeFile.addEventListener("click", () => setSelectedFile(null));

for (const eventName of ["dragenter", "dragover"]) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("is-dragging");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("is-dragging");
  });
}

elements.dropZone.addEventListener("drop", (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  elements.fileInput.files = transfer.files;
  setSelectedFile(file);
});

elements.uploadForm.addEventListener("submit", async (event) => {
  // The explicit preventDefault also protects against accidental native form navigation.
  event.preventDefault();
  const file = elements.fileInput.files[0];
  if (!file) {
    setUploadStatus("Select a PDF before uploading.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  setBusy(elements.uploadButton, true);
  setUploadStatus("Uploading and indexing your document. This can take a little while…", "pending");

  try {
    const response = await fetch(`${API}/api/documents/upload`, { method: "POST", body: formData });
    const result = await readResponse(response);
    elements.indexedSummary.textContent = result.filename || file.name;
    elements.indexedCount.textContent = `${result.chunks_indexed} text ${result.chunks_indexed === 1 ? "chunk" : "chunks"} indexed`;
    elements.indexedCard.hidden = false;
    setUploadStatus("Your document is ready. Ask a question to get started.", "success");
    elements.fileInput.value = "";
    elements.selectedFile.hidden = true;
    elements.uploadButtonText.textContent = "Upload and index document";
    elements.uploadButton.disabled = true;
    elements.question.focus();
  } catch (error) {
    setUploadStatus(error.message || "The document could not be indexed. Please try again.", "error");
  } finally {
    elements.uploadButton.classList.remove("is-busy");
    elements.uploadButton.disabled = !elements.fileInput.files[0];
  }
});

function appendMessage(role, text, sources = [], answerType = null) {
  const row = document.createElement("article");
  row.className = `message-row message-${role}`;

  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "assistant-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.innerHTML = 'a<span>✳</span>';
    row.append(avatar);
  }

  const body = document.createElement("div");
  body.className = "message-body";
  const author = document.createElement("span");
  author.className = "message-author";
  if (role === "assistant" && answerType === "document") {
    author.textContent = "📄 Document Answer";
  } else if (role === "assistant" && answerType === "general") {
    author.textContent = "✨ Gemini General Answer";
  } else {
    author.textContent = role === "assistant" ? "ATLAS ASSISTANT" : "YOU";
  }
  const content = document.createElement("p");
  content.className = "message-text";
  content.textContent = text;
  body.append(author, content);

  if (role === "assistant" && answerType === "general") {
    const note = document.createElement("p");
    note.className = "message-text";
    note.textContent = "ℹ️ This answer was not based on your uploaded documents.";
    body.append(note);
  }

  if (role === "assistant" && answerType === "document" && sources.length) {
    const sourceHeading = document.createElement("span");
    sourceHeading.className = "message-author";
    sourceHeading.textContent = "📚 Sources";
    body.append(sourceHeading);

    const sourceList = document.createElement("div");
    sourceList.className = "source-list";
    for (const source of sources) {
      const tag = document.createElement("span");
      tag.className = "source-tag";
      tag.textContent = `${source.source} — Page ${source.page}`;
      sourceList.append(tag);
    }
    body.append(sourceList);
  }

  row.append(body);
  elements.messages.append(row);
  elements.conversation.scrollTop = elements.conversation.scrollHeight;
  return content;
}

async function askQuestion(question) {
  const text = (question ?? elements.question.value).trim();
  if (!text) return;

  elements.question.value = "";
  elements.question.style.height = "auto";
  appendMessage("user", text);
  elements.sendButton.disabled = true;
  elements.sendButton.classList.add("is-busy");
  elements.thinkingRow.hidden = false;
  elements.conversation.scrollTop = elements.conversation.scrollHeight;

  try {
    const response = await fetch(`${API}/api/chat/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: text, top_k: 5 }),
    });
    const result = await readResponse(response);
    appendMessage(
      "assistant",
      result.answer || "No answer was generated.",
      result.sources || [],
      result.answer_type,
    );
  } catch (error) {
    appendMessage("assistant", error.message || "I couldn't reach the API. Check that the backend is running and try again.");
  } finally {
    elements.thinkingRow.hidden = true;
    elements.sendButton.classList.remove("is-busy");
    elements.sendButton.disabled = !elements.question.value.trim();
    elements.question.focus();
  }
}

elements.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  askQuestion();
});

elements.question.addEventListener("input", () => {
  elements.question.style.height = "auto";
  elements.question.style.height = `${Math.min(elements.question.scrollHeight, 160)}px`;
  elements.sendButton.disabled = !elements.question.value.trim();
});

elements.question.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (!elements.sendButton.disabled) elements.chatForm.requestSubmit();
  }
});

document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => {
    elements.question.value = button.dataset.question;
    elements.question.dispatchEvent(new Event("input", { bubbles: true }));
    elements.chatForm.requestSubmit();
  });
});

checkConnection();
