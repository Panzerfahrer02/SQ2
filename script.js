const STORAGE_PREFIX = "sidequestSimulatorBoard:";
const BOARD_PARAM = "board";
const ACTION_PARAM = "action";

const questForm = document.getElementById("questForm");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const assigneeInput = document.getElementById("assignee");
const dueDateInput = document.getElementById("dueDate");
const clearAllBtn = document.getElementById("clearAllBtn");
const shareBoardBtn = document.getElementById("shareBoardBtn");

const requestedList = document.getElementById("requestedList");
const acceptedList = document.getElementById("acceptedList");
const completedList = document.getElementById("completedList");
const rejectedList = document.getElementById("rejectedList");

const requestedCount = document.getElementById("requestedCount");
const acceptedCount = document.getElementById("acceptedCount");
const completedCount = document.getElementById("completedCount");
const rejectedCount = document.getElementById("rejectedCount");

const responseModal = document.getElementById("responseModal");
const modalTitle = document.getElementById("modalTitle");
const modalQuestInfo = document.getElementById("modalQuestInfo");
const responseAuthor = document.getElementById("responseAuthor");
const responseMessage = document.getElementById("responseMessage");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const confirmModalBtn = document.getElementById("confirmModalBtn");

const toggleQuestFormBtn = document.getElementById("toggleQuestFormBtn");
const questFormWrapper = document.getElementById("questFormWrapper");
const toggleIcon = document.getElementById("toggleIcon");

const boardTitle = document.getElementById("boardTitle");
const boardInput = document.getElementById("boardInput");
const openBoardBtn = document.getElementById("openBoardBtn");
const statusBanner = document.getElementById("statusBanner");

let currentBoardId = getBoardIdFromUrl();
let quests = [];
let pendingAction = null;

initialize();

function initialize() {
  boardInput.value = currentBoardId;
  boardTitle.textContent = "Board: " + currentBoardId;

  initCollapseForMobile();
  bindEvents();

  quests = loadQuests();

  handleIncomingLinkAction();

  renderAll();
}

function bindEvents() {
  questForm.addEventListener("submit", handleQuestSubmit);
  clearAllBtn.addEventListener("click", clearAllQuests);
  shareBoardBtn.addEventListener("click", exportRequestedQuests);

  cancelModalBtn.addEventListener("click", closeModal);
  confirmModalBtn.addEventListener("click", confirmModalAction);

  responseModal.addEventListener("click", function (event) {
    if (event.target === responseModal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !responseModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  toggleQuestFormBtn.addEventListener("click", toggleQuestForm);
  openBoardBtn.addEventListener("click", openAnotherBoard);

  boardInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      openAnotherBoard();
    }
  });
}

function getBoardIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = (params.get(BOARD_PARAM) || "default").trim().toLowerCase();
  return sanitizeBoardId(raw) || "default";
}

function sanitizeBoardId(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function getStorageKey(boardId) {
  return STORAGE_PREFIX + boardId;
}

function loadQuests() {
  try {
    const raw = localStorage.getItem(getStorageKey(currentBoardId));

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Fehler beim Laden:", error);
    return [];
  }
}

function saveQuests() {
  localStorage.setItem(getStorageKey(currentBoardId), JSON.stringify(quests));
}

function initCollapseForMobile() {
  const shouldCollapse = window.innerWidth <= 768;
  setQuestFormCollapsed(shouldCollapse);
}

function toggleQuestForm() {
  const isCollapsed = questFormWrapper.classList.contains("collapsed");
  setQuestFormCollapsed(!isCollapsed);
}

function setQuestFormCollapsed(collapsed) {
  if (collapsed) {
    questFormWrapper.classList.add("collapsed");
    toggleQuestFormBtn.setAttribute("aria-expanded", "false");
    toggleIcon.textContent = "▾";
  } else {
    questFormWrapper.classList.remove("collapsed");
    toggleQuestFormBtn.setAttribute("aria-expanded", "true");
    toggleIcon.textContent = "▴";
  }
}

function handleQuestSubmit(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const assignee = assigneeInput.value.trim();
  const dueDate = dueDateInput.value;

  if (!title || !assignee || !dueDate) {
    alert("Bitte Titel, Person und Fälligkeitsdatum ausfüllen.");
    return;
  }

  const newQuest = {
    id: createId(),
    title: title,
    description: description,
    assignee: assignee,
    dueDate: dueDate,
    status: "requested",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    responseMessage: "",
    responseType: "",
    responseAuthor: "",
    source: "local"
  };

  quests.push(newQuest);
  saveQuests();
  renderAll();
  questForm.reset();
  setQuestFormCollapsed(true);
  showStatus("Sidequest hinzugefügt.");
}

function clearAllQuests() {
  const confirmed = confirm("Wirklich alle Sidequests in diesem Board löschen?");
  if (!confirmed) {
    return;
  }

  quests = [];
  saveQuests();
  renderAll();
  showStatus("Alle Quests wurden gelöscht.");
}

function exportRequestedQuests() {
  const requested = quests.filter(function (quest) {
    return quest.status === "requested";
  });

  if (requested.length === 0) {
    showStatus("Keine offenen Quests zum Exportieren.");
    return;
  }

  const links = requested.map(function (quest) {
    return buildQuestRequestLink(quest);
  });

  const text = links.join("\n\n");

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      showStatus("Quest-Links in die Zwischenablage kopiert.");
    }).catch(function () {
      prompt("Kopiere diese Quest-Links:", text);
    });
  } else {
    prompt("Kopiere diese Quest-Links:", text);
  }
}

function buildQuestRequestLink(quest) {
  const url = new URL(window.location.origin + window.location.pathname);

  url.searchParams.set(BOARD_PARAM, currentBoardId);
  url.searchParams.set(ACTION_PARAM, "quest");
  url.searchParams.set("qid", quest.id);
  url.searchParams.set("title", quest.title);
  url.searchParams.set("description", quest.description || "");
  url.searchParams.set("assignee", quest.assignee);
  url.searchParams.set("dueDate", quest.dueDate);
  url.searchParams.set("createdAt", quest.createdAt || "");
  url.searchParams.set("updatedAt", quest.updatedAt || "");

  return url.toString();
}

function buildQuestResponseLink(quest) {
  const url = new URL(window.location.origin + window.location.pathname);

  url.searchParams.set(BOARD_PARAM, currentBoardId);
  url.searchParams.set(ACTION_PARAM, "response");
  url.searchParams.set("qid", quest.id);
  url.searchParams.set("status", quest.status);
  url.searchParams.set("responseAuthor", quest.responseAuthor || "");
  url.searchParams.set("responseMessage", quest.responseMessage || "");
  url.searchParams.set("responseType", quest.responseType || "");
  url.searchParams.set("updatedAt", quest.updatedAt || new Date().toISOString());

  return url.toString();
}

function handleIncomingLinkAction() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get(ACTION_PARAM);

  if (!action) {
    return;
  }

  if (action === "quest") {
    importQuestFromUrl(params);
    cleanupActionParams();
    return;
  }

  if (action === "response") {
    importResponseFromUrl(params);
    cleanupActionParams();
  }
}

function importQuestFromUrl(params) {
  const id = params.get("qid");
  const title = params.get("title");
  const description = params.get("description") || "";
  const assignee = params.get("assignee");
  const dueDate = params.get("dueDate");
  const createdAt = params.get("createdAt") || new Date().toISOString();
  const updatedAt = params.get("updatedAt") || new Date().toISOString();

  if (!id || !title || !assignee || !dueDate) {
    showStatus("Quest-Link unvollständig.");
    return;
  }

  const existingIndex = quests.findIndex(function (quest) {
    return quest.id === id;
  });

  const importedQuest = {
    id: id,
    title: title,
    description: description,
    assignee: assignee,
    dueDate: dueDate,
    status: "requested",
    createdAt: createdAt,
    updatedAt: updatedAt,
    responseMessage: "",
    responseType: "",
    responseAuthor: "",
    source: "imported"
  };

  if (existingIndex >= 0) {
    quests[existingIndex] = {
      ...quests[existingIndex],
      ...importedQuest
    };
    showStatus("Quest aus Link aktualisiert.");
  } else {
    quests.push(importedQuest);
    showStatus("Quest aus Link importiert.");
  }

  saveQuests();
}

function importResponseFromUrl(params) {
  const id = params.get("qid");
  const status = params.get("status");
  const responseAuthor = params.get("responseAuthor") || "";
  const responseMessage = params.get("responseMessage") || "";
  const responseType = params.get("responseType") || status || "";
  const updatedAt = params.get("updatedAt") || new Date().toISOString();

  if (!id || !status) {
    showStatus("Antwort-Link unvollständig.");
    return;
  }

  const existingIndex = quests.findIndex(function (quest) {
    return quest.id === id;
  });

  if (existingIndex < 0) {
    showStatus("Antwort erhalten, aber passende Quest lokal nicht gefunden.");
    return;
  }

  quests[existingIndex] = {
    ...quests[existingIndex],
    status: status,
    responseAuthor: responseAuthor,
    responseMessage: responseMessage,
    responseType: responseType,
    updatedAt: updatedAt
  };

  saveQuests();
  showStatus("Quest-Antwort aus Link übernommen.");
}

function cleanupActionParams() {
  const url = new URL(window.location.href);

  url.searchParams.delete(ACTION_PARAM);
  url.searchParams.delete("qid");
  url.searchParams.delete("title");
  url.searchParams.delete("description");
  url.searchParams.delete("assignee");
  url.searchParams.delete("dueDate");
  url.searchParams.delete("createdAt");
  url.searchParams.delete("updatedAt");
  url.searchParams.delete("status");
  url.searchParams.delete("responseAuthor");
  url.searchParams.delete("responseMessage");
  url.searchParams.delete("responseType");

  window.history.replaceState({}, "", url.toString());
}

function openAnotherBoard() {
  const newBoard = sanitizeBoardId(boardInput.value.trim());

  if (!newBoard) {
    alert("Bitte einen gültigen Board-Namen eingeben.");
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set(BOARD_PARAM, newBoard);
  url.searchParams.delete(ACTION_PARAM);
  window.location.href = url.toString();
}

function renderAll() {
  clearLists();

  const requested = quests.filter(function (quest) {
    return quest.status === "requested";
  });

  const accepted = quests.filter(function (quest) {
    return quest.status === "accepted";
  });

  const completed = quests.filter(function (quest) {
    return quest.status === "completed";
  });

  const rejected = quests.filter(function (quest) {
    return quest.status === "rejected";
  });

  updateCounters(requested, accepted, completed, rejected);

  renderQuestGroup(requested, requestedList);
  renderQuestGroup(accepted, acceptedList);
  renderQuestGroup(completed, completedList);
  renderQuestGroup(rejected, rejectedList);
}

function updateCounters(requested, accepted, completed, rejected) {
  requestedCount.textContent = requested.length;
  acceptedCount.textContent = accepted.length;
  completedCount.textContent = completed.length;
  rejectedCount.textContent = rejected.length;
}

function clearLists() {
  requestedList.innerHTML = "";
  acceptedList.innerHTML = "";
  completedList.innerHTML = "";
  rejectedList.innerHTML = "";
}

function renderQuestGroup(group, targetElement) {
  if (group.length === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "empty-state";
    emptyMessage.textContent = "Keine Quests vorhanden.";
    targetElement.appendChild(emptyMessage);
    return;
  }

  group
    .slice()
    .sort(function (a, b) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    })
    .forEach(function (quest) {
      targetElement.appendChild(createQuestCard(quest));
    });
}

function createQuestCard(quest) {
  const card = document.createElement("article");
  card.className = "quest-card";

  const title = document.createElement("h3");
  title.textContent = quest.title;

  const assignee = document.createElement("p");
  assignee.innerHTML = "<strong>Für:</strong> " + escapeHtml(quest.assignee);

  const description = document.createElement("p");
  description.innerHTML =
    "<strong>Beschreibung:</strong> " +
    (quest.description ? escapeHtml(quest.description) : "Keine Beschreibung");

  const dueDate = document.createElement("p");
  dueDate.innerHTML = "<strong>Fällig am:</strong> " + formatDate(quest.dueDate);

  const statusInfo = document.createElement("p");
  statusInfo.className = "status-info";
  statusInfo.textContent = getStatusText(quest);

  card.appendChild(title);
  card.appendChild(assignee);
  card.appendChild(description);
  card.appendChild(dueDate);
  card.appendChild(statusInfo);

  if (quest.responseMessage || quest.responseAuthor) {
    const responseBlock = document.createElement("div");
    responseBlock.className = "response-note";

    const responseTitle = document.createElement("span");
    responseTitle.className = "response-note-title";

    if (quest.responseType === "accepted") {
      responseTitle.textContent = "Nachricht zur Annahme";
    } else if (quest.responseType === "rejected") {
      responseTitle.textContent = "Nachricht zur Ablehnung";
    } else {
      responseTitle.textContent = "Nachricht";
    }

    const meta = document.createElement("div");
    if (quest.responseAuthor) {
      meta.textContent = "Von: " + quest.responseAuthor;
      meta.style.marginBottom = "6px";
    }

    const responseText = document.createElement("div");
    responseText.textContent = quest.responseMessage || "Keine zusätzliche Nachricht.";

    responseBlock.appendChild(responseTitle);
    if (quest.responseAuthor) {
      responseBlock.appendChild(meta);
    }
    responseBlock.appendChild(responseText);
    card.appendChild(responseBlock);
  }

  const actions = document.createElement("div");
  actions.className = "quest-actions";

  if (quest.status === "requested") {
    actions.appendChild(
      createButton("Quest-Link", "reset-btn", function () {
        copyText(buildQuestRequestLink(quest), "Quest-Link kopiert.");
      })
    );

    actions.appendChild(
      createButton("Annehmen", "accept-btn", function () {
        openResponseModal(quest, "accepted");
      })
    );

    actions.appendChild(
      createButton("Ablehnen", "reject-btn", function () {
        openResponseModal(quest, "rejected");
      })
    );
  }

  if (quest.status === "accepted") {
    actions.appendChild(
      createButton("Als absolviert markieren", "complete-btn", function () {
        updateQuest(quest.id, {
          status: "completed",
          updatedAt: new Date().toISOString()
        });
      })
    );

    actions.appendChild(
      createButton("Antwort-Link", "reset-btn", function () {
        copyText(buildQuestResponseLink(quest), "Antwort-Link kopiert.");
      })
    );

    actions.appendChild(
      createButton("Ablehnen", "reject-btn", function () {
        openResponseModal(quest, "rejected");
      })
    );
  }

  if (quest.status === "rejected") {
    actions.appendChild(
      createButton("Antwort-Link", "reset-btn", function () {
        copyText(buildQuestResponseLink(quest), "Antwort-Link kopiert.");
      })
    );
  }

  if (quest.status === "completed") {
    actions.appendChild(
      createButton("Zurück auf offen", "reset-btn", function () {
        updateQuest(quest.id, {
          status: "requested",
          responseMessage: "",
          responseType: "",
          responseAuthor: "",
          updatedAt: new Date().toISOString()
        });
      })
    );
  }

  if (quest.status === "completed" || quest.status === "rejected") {
    actions.appendChild(
      createButton("Zurück auf offen", "reset-btn", function () {
        updateQuest(quest.id, {
          status: "requested",
          responseMessage: "",
          responseType: "",
          responseAuthor: "",
          updatedAt: new Date().toISOString()
        });
      })
    );
  }

  actions.appendChild(
    createButton("Löschen", "delete-btn", function () {
      deleteQuestById(quest.id);
    })
  );

  card.appendChild(actions);

  return card;
}

function createButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function openResponseModal(quest, newStatus) {
  pendingAction = {
    questId: quest.id,
    newStatus: newStatus
  };

  modalTitle.textContent = newStatus === "accepted" ? "Quest annehmen" : "Quest ablehnen";
  modalQuestInfo.textContent = 'Quest: "' + quest.title + '" für ' + quest.assignee;

  responseAuthor.value = "";
  responseMessage.value = "";

  responseModal.classList.remove("hidden");
  responseModal.setAttribute("aria-hidden", "false");
  responseAuthor.focus();
}

function closeModal() {
  pendingAction = null;
  responseAuthor.value = "";
  responseMessage.value = "";
  responseModal.classList.add("hidden");
  responseModal.setAttribute("aria-hidden", "true");
}

function confirmModalAction() {
  if (!pendingAction) {
    closeModal();
    return;
  }

  updateQuest(pendingAction.questId, {
    status: pendingAction.newStatus,
    responseAuthor: responseAuthor.value.trim(),
    responseMessage: responseMessage.value.trim(),
    responseType: pendingAction.newStatus,
    updatedAt: new Date().toISOString()
  });

  closeModal();
  showStatus("Quest aktualisiert. Jetzt kannst du einen Antwort-Link schicken.");
}

function updateQuest(id, updates) {
  quests = quests.map(function (quest) {
    if (quest.id !== id) {
      return quest;
    }

    return {
      ...quest,
      ...updates
    };
  });

  saveQuests();
  renderAll();
}

function deleteQuestById(id) {
  const confirmed = confirm("Diese Sidequest wirklich löschen?");
  if (!confirmed) {
    return;
  }

  quests = quests.filter(function (quest) {
    return quest.id !== id;
  });

  saveQuests();
  renderAll();
  showStatus("Quest gelöscht.");
}

function getStatusText(quest) {
  if (quest.status === "requested") {
    return "Status: Offen";
  }

  if (quest.status === "accepted") {
    const today = new Date();
    const due = new Date(quest.dueDate);

    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    if (due.getTime() > today.getTime()) {
      return "Status: Angenommen";
    }

    if (due.getTime() === today.getTime()) {
      return "Status: Angenommen · Heute fällig";
    }

    return "Status: Angenommen · Überfällig";
  }

  if (quest.status === "completed") {
    return "Status: Absolviert";
  }

  if (quest.status === "rejected") {
    return "Status: Abgelehnt";
  }

  return "Status: Unbekannt";
}

function formatDate(dateString) {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return "quest-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

function copyText(text, successMessage) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      showStatus(successMessage);
    }).catch(function () {
      prompt("Kopiere diesen Link:", text);
    });
  } else {
    prompt("Kopiere diesen Link:", text);
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

let statusTimeout = null;
function showStatus(message) {
  statusBanner.textContent = message;
  statusBanner.classList.remove("hidden");

  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(function () {
    statusBanner.classList.add("hidden");
  }, 2600);
}
