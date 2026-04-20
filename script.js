const STORAGE_PREFIX = "sidequestSimulatorBoard:";
const BOARD_PARAM = "board";
const FLOW_PARAM = "flow";

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

  const handled = handleIncomingFlow();

  if (!handled) {
    renderAll();
  }
}

function bindEvents() {
  questForm.addEventListener("submit", handleQuestSubmit);
  clearAllBtn.addEventListener("click", clearAllQuests);

  if (shareBoardBtn) {
    shareBoardBtn.addEventListener("click", function () {
      showStatus("Quests jetzt bitte direkt über den Button in der jeweiligen Quest teilen.");
    });
  }

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
    outgoingResponseLink: ""
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

function buildQuestLink(quest) {
  const url = new URL(window.location.origin + window.location.pathname);

  url.searchParams.set(BOARD_PARAM, currentBoardId);
  url.searchParams.set(FLOW_PARAM, "quest");
  url.searchParams.set("qid", quest.id);
  url.searchParams.set("title", quest.title);
  url.searchParams.set("description", quest.description || "");
  url.searchParams.set("assignee", quest.assignee);
  url.searchParams.set("dueDate", quest.dueDate);

  return url.toString();
}

function buildResponseLink(quest) {
  const url = new URL(window.location.origin + window.location.pathname);

  url.searchParams.set(BOARD_PARAM, currentBoardId);
  url.searchParams.set(FLOW_PARAM, "response");
  url.searchParams.set("qid", quest.id);
  url.searchParams.set("status", quest.status);
  url.searchParams.set("author", quest.responseAuthor || "");
  url.searchParams.set("message", quest.responseMessage || "");
  url.searchParams.set("type", quest.responseType || quest.status || "");

  return url.toString();
}

function handleIncomingFlow() {
  const params = new URLSearchParams(window.location.search);
  const flow = params.get(FLOW_PARAM);

  if (!flow) {
    return false;
  }

  if (flow === "quest") {
    renderIncomingQuestView(params);
    return true;
  }

  if (flow === "response") {
    applyIncomingResponse(params);
    cleanupFlowParams();
    renderAll();
    return true;
  }

  return false;
}

function renderIncomingQuestView(params) {
  const quest = {
    id: params.get("qid") || "",
    title: params.get("title") || "",
    description: params.get("description") || "",
    assignee: params.get("assignee") || "",
    dueDate: params.get("dueDate") || ""
  };

  if (!quest.id || !quest.title || !quest.assignee || !quest.dueDate) {
    cleanupFlowParams();
    renderAll();
    showStatus("Quest-Link ist unvollständig.");
    return;
  }

  const container = document.querySelector(".container");

  container.innerHTML = `
    <header class="hero-card">
      <div>
        <p class="eyebrow">Sidequest Anfrage</p>
        <h1>${escapeHtml(quest.title)}</h1>
      </div>
    </header>

    <section class="panel">
      <div class="quest-card">
        <p><strong>Für:</strong> ${escapeHtml(quest.assignee)}</p>
        <p><strong>Beschreibung:</strong> ${quest.description ? escapeHtml(quest.description) : "Keine Beschreibung"}</p>
        <p><strong>Fällig am:</strong> ${formatDate(quest.dueDate)}</p>

        <div style="margin-top:16px;">
          <label for="incomingAuthor">Dein Name (optional)</label>
          <input id="incomingAuthor" type="text" placeholder="z. B. Alex" />

          <label for="incomingMessage" style="margin-top:12px; display:block;">Nachricht (optional)</label>
          <textarea id="incomingMessage" rows="5" placeholder="z. B. Mach ich morgen / Keine Zeit"></textarea>

          <div class="quest-actions" style="margin-top:16px;">
            <button id="incomingAcceptBtn" class="accept-btn" type="button">Annehmen</button>
            <button id="incomingRejectBtn" class="reject-btn" type="button">Ablehnen</button>
            <button id="incomingImportBtn" class="reset-btn" type="button">Nur lokal speichern</button>
          </div>
        </div>

        <div id="incomingResultArea" style="margin-top:18px;"></div>
      </div>
    </section>
  `;

  document.getElementById("incomingImportBtn").addEventListener("click", function () {
    importQuestLocally(quest);
    cleanupFlowParams();
    window.location.href = baseBoardUrl(currentBoardId);
  });

  document.getElementById("incomingAcceptBtn").addEventListener("click", function () {
    createIncomingResponse(quest, "accepted");
  });

  document.getElementById("incomingRejectBtn").addEventListener("click", function () {
    createIncomingResponse(quest, "rejected");
  });
}

function createIncomingResponse(quest, newStatus) {
  const author = document.getElementById("incomingAuthor").value.trim();
  const message = document.getElementById("incomingMessage").value.trim();

  const responseQuest = {
    id: quest.id,
    status: newStatus,
    responseAuthor: author,
    responseMessage: message,
    responseType: newStatus
  };

  const link = buildResponseLink(responseQuest);
  const resultArea = document.getElementById("incomingResultArea");

  resultArea.innerHTML = `
    <div class="response-note">
      <span class="response-note-title">Antwort-Link</span>
      <div style="margin-bottom:10px;">Schicke diesen Link an die Person zurück, die dir die Quest geschickt hat.</div>
      <textarea class="linkbox-like" readonly style="width:100%; min-height:90px;">${link}</textarea>
      <div class="quest-actions" style="margin-top:12px;">
        <button id="copyResponseLinkBtn" class="primary-btn" type="button">Antwort-Link kopieren</button>
      </div>
    </div>
  `;

  document.getElementById("copyResponseLinkBtn").addEventListener("click", function () {
    copyText(link, "Antwort-Link kopiert.");
  });
}

function importQuestLocally(quest) {
  const existingIndex = quests.findIndex(function (entry) {
    return entry.id === quest.id;
  });

  const importedQuest = {
    id: quest.id,
    title: quest.title,
    description: quest.description,
    assignee: quest.assignee,
    dueDate: quest.dueDate,
    status: "requested",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    responseMessage: "",
    responseType: "",
    responseAuthor: "",
    outgoingResponseLink: ""
  };

  if (existingIndex >= 0) {
    quests[existingIndex] = {
      ...quests[existingIndex],
      ...importedQuest
    };
  } else {
    quests.push(importedQuest);
  }

  saveQuests();
  showStatus("Quest lokal gespeichert.");
}

function applyIncomingResponse(params) {
  const id = params.get("qid");
  const status = params.get("status");
  const author = params.get("author") || "";
  const message = params.get("message") || "";
  const type = params.get("type") || status || "";

  if (!id || !status) {
    showStatus("Antwort-Link ist unvollständig.");
    return;
  }

  const existingIndex = quests.findIndex(function (quest) {
    return quest.id === id;
  });

  if (existingIndex < 0) {
    showStatus("Passende Quest lokal nicht gefunden.");
    return;
  }

  quests[existingIndex] = {
    ...quests[existingIndex],
    status: status,
    responseAuthor: author,
    responseMessage: message,
    responseType: type,
    updatedAt: new Date().toISOString(),
    outgoingResponseLink: ""
  };

  saveQuests();
  showStatus("Antwort übernommen.");
}

function cleanupFlowParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete(FLOW_PARAM);
  url.searchParams.delete("qid");
  url.searchParams.delete("title");
  url.searchParams.delete("description");
  url.searchParams.delete("assignee");
  url.searchParams.delete("dueDate");
  url.searchParams.delete("status");
  url.searchParams.delete("author");
  url.searchParams.delete("message");
  url.searchParams.delete("type");
  window.history.replaceState({}, "", url.toString());
}

function baseBoardUrl(boardId) {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set(BOARD_PARAM, boardId);
  return url.toString();
}

function openAnotherBoard() {
  const newBoard = sanitizeBoardId(boardInput.value.trim());

  if (!newBoard) {
    alert("Bitte einen gültigen Board-Namen eingeben.");
    return;
  }

  window.location.href = baseBoardUrl(newBoard);
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
      createButton("Quest senden", "reset-btn", function () {
        copyText(buildQuestLink(quest), "Quest-Link kopiert.");
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
      createButton("Antwort-Link", "reset-btn", function () {
        copyText(buildResponseLink(quest), "Antwort-Link kopiert.");
      })
    );

    actions.appendChild(
      createButton("Als absolviert markieren", "complete-btn", function () {
        updateQuest(quest.id, {
          status: "completed",
          updatedAt: new Date().toISOString()
        });
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
        copyText(buildResponseLink(quest), "Antwort-Link kopiert.");
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
  showStatus("Quest aktualisiert.");
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
