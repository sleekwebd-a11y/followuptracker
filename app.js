const storageKey = `${location.pathname}-followup-flow-leads`;
const themeKey = `${location.pathname}-followup-flow-theme`;

const leadForm = document.getElementById("leadForm");
const leadList = document.getElementById("leadList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const themeToggle = document.getElementById("themeToggle");
const resetFormBtn = document.getElementById("resetFormBtn");

const statTotal = document.getElementById("statTotal");
const statToday = document.getElementById("statToday");
const statOverdue = document.getElementById("statOverdue");
const statWon = document.getElementById("statWon");

const fields = {
  leadName: document.getElementById("leadName"),
  companyName: document.getElementById("companyName"),
  email: document.getElementById("email"),
  phone: document.getElementById("phone"),
  status: document.getElementById("status"),
  priority: document.getElementById("priority"),
  owner: document.getElementById("owner"),
  followUpDate: document.getElementById("followUpDate"),
  nextAction: document.getElementById("nextAction"),
  notes: document.getElementById("notes")
};

let activeFilter = "all";
let leads = loadLeads();

function todayString() {
  return new Date().toISOString().split("T")[0];
}

function loadLeads() {
  return JSON.parse(localStorage.getItem(storageKey) || "[]");
}

function saveLeads() {
  localStorage.setItem(storageKey, JSON.stringify(leads));
}

function setDefaultDate() {
  if (!fields.followUpDate.value) {
    fields.followUpDate.value = todayString();
  }
}

function formData() {
  return {
    id: crypto.randomUUID(),
    leadName: fields.leadName.value.trim(),
    companyName: fields.companyName.value.trim(),
    email: fields.email.value.trim(),
    phone: fields.phone.value.trim(),
    status: fields.status.value,
    priority: fields.priority.value,
    owner: fields.owner.value.trim(),
    followUpDate: fields.followUpDate.value,
    nextAction: fields.nextAction.value.trim(),
    notes: fields.notes.value.trim(),
    createdAt: new Date().toISOString()
  };
}

function clearForm() {
  leadForm.reset();
  fields.status.value = "new";
  fields.priority.value = "medium";
  setDefaultDate();
}

function isToday(date) {
  return date === todayString();
}

function isOverdue(date, status) {
  if (!date) return false;
  if (status === "won" || status === "lost") return false;
  return date < todayString();
}

function matchesFilter(lead) {
  if (activeFilter === "all") return true;
  if (activeFilter === "today") return isToday(lead.followUpDate);
  if (activeFilter === "overdue") return isOverdue(lead.followUpDate, lead.status);
  if (activeFilter === "waiting") return lead.status === "waiting";
  if (activeFilter === "won") return lead.status === "won";
  if (activeFilter === "lost") return lead.status === "lost";
  return true;
}

function matchesSearch(lead, term) {
  const haystack = [
    lead.leadName,
    lead.companyName,
    lead.email,
    lead.phone,
    lead.owner,
    lead.nextAction,
    lead.notes
  ].join(" ").toLowerCase();

  return haystack.includes(term.toLowerCase());
}

function prettyStatus(status) {
  const map = {
    new: "New",
    contacted: "Contacted",
    waiting: "Waiting",
    meeting: "Meeting booked",
    won: "Won",
    lost: "Lost"
  };
  return map[status] || status;
}

function formatDate(date) {
  if (!date) return "No date";
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

function getVisibleLeads() {
  const term = searchInput.value.trim();
  return leads
    .filter(matchesFilter)
    .filter(lead => matchesSearch(lead, term))
    .sort((a, b) => {
      if (a.status === "won" && b.status !== "won") return 1;
      if (a.status !== "won" && b.status === "won") return -1;
      if (a.status === "lost" && b.status !== "lost") return 1;
      if (a.status !== "lost" && b.status === "lost") return -1;
      return (a.followUpDate || "").localeCompare(b.followUpDate || "");
    });
}

function renderStats() {
  statTotal.textContent = leads.length;
  statToday.textContent = leads.filter(lead => isToday(lead.followUpDate)).length;
  statOverdue.textContent = leads.filter(lead => isOverdue(lead.followUpDate, lead.status)).length;
  statWon.textContent = leads.filter(lead => lead.status === "won").length;
}

function renderLeads() {
  const visibleLeads = getVisibleLeads();
  renderStats();

  emptyState.style.display = visibleLeads.length ? "none" : "block";
  leadList.innerHTML = visibleLeads.map(lead => {
    const overdue = isOverdue(lead.followUpDate, lead.status);
    const dueToday = isToday(lead.followUpDate);
    const dueLabel = overdue ? "Overdue" : dueToday ? "Due today" : "Upcoming";

    return `
      <article class="lead-card">
        <div class="lead-top">
          <div class="lead-meta">
            <h4>${escapeHtml(lead.leadName || "Unnamed lead")}</h4>
            <p>${escapeHtml(lead.companyName || "No company")} · ${escapeHtml(lead.email || "No email")}</p>
          </div>

          <div class="badge-row">
            <span class="badge status-${lead.status}">${prettyStatus(lead.status)}</span>
            <span class="badge priority-${lead.priority}">${lead.priority} priority</span>
          </div>
        </div>

        <div class="lead-grid">
          <div class="info-box">
            <span>Next follow-up</span>
            <strong>${formatDate(lead.followUpDate)}</strong>
          </div>
          <div class="info-box">
            <span>Timing</span>
            <strong>${dueLabel}</strong>
          </div>
          <div class="info-box">
            <span>Owner</span>
            <strong>${escapeHtml(lead.owner || "Unassigned")}</strong>
          </div>
          <div class="info-box">
            <span>Next action</span>
            <strong>${escapeHtml(lead.nextAction || "No next action set")}</strong>
          </div>
        </div>

        <div class="lead-notes">${escapeHtml(lead.notes || "No notes yet.")}</div>

        <div class="lead-actions">
          <button class="action-btn" data-action="advance" data-id="${lead.id}">Advance status</button>
          <button class="action-btn" data-action="today" data-id="${lead.id}">Set follow-up to today</button>
          <button class="action-btn" data-action="copy" data-id="${lead.id}">Copy summary</button>
          <button class="action-btn delete" data-action="delete" data-id="${lead.id}">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function advanceStatus(id) {
  const order = ["new", "contacted", "waiting", "meeting", "won"];
  leads = leads.map(lead => {
    if (lead.id !== id) return lead;
    if (lead.status === "lost" || lead.status === "won") return lead;
    const nextIndex = Math.min(order.indexOf(lead.status) + 1, order.length - 1);
    return { ...lead, status: order[nextIndex] };
  });
  saveLeads();
  renderLeads();
}

function setFollowUpToday(id) {
  leads = leads.map(lead =>
    lead.id === id ? { ...lead, followUpDate: todayString() } : lead
  );
  saveLeads();
  renderLeads();
}

function deleteLead(id) {
  leads = leads.filter(lead => lead.id !== id);
  saveLeads();
  renderLeads();
}

function copyLeadSummary(id) {
  const lead = leads.find(item => item.id === id);
  if (!lead) return;

  const text = `Lead: ${lead.leadName}
Company: ${lead.companyName}
Email: ${lead.email}
Phone: ${lead.phone}
Status: ${prettyStatus(lead.status)}
Priority: ${lead.priority}
Owner: ${lead.owner}
Next follow-up: ${lead.followUpDate}
Next action: ${lead.nextAction}
Notes: ${lead.notes}`;

  navigator.clipboard.writeText(text);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

leadForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const newLead = formData();
  if (!newLead.leadName || !newLead.followUpDate) return;

  leads.unshift(newLead);
  saveLeads();
  renderLeads();
  clearForm();
});

resetFormBtn.addEventListener("click", clearForm);

searchInput.addEventListener("input", renderLeads);

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(item => item.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderLeads();
  });
});

leadList.addEventListener("click", (e) => {
  const action = e.target.dataset.action;
  const id = e.target.dataset.id;
  if (!action || !id) return;

  if (action === "advance") advanceStatus(id);
  if (action === "today") setFollowUpToday(id);
  if (action === "copy") copyLeadSummary(id);
  if (action === "delete") deleteLead(id);
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(leads, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "followup-flow-data.json";
  a.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      leads = parsed;
      saveLeads();
      renderLeads();
    }
  } catch (err) {
    alert("Invalid JSON file.");
  }

  e.target.value = "";
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const mode = document.body.classList.contains("light") ? "light" : "dark";
  localStorage.setItem(themeKey, mode);
});

(function initTheme() {
  const savedTheme = localStorage.getItem(themeKey);
  if (savedTheme === "light") {
    document.body.classList.add("light");
  }
})();

setDefaultDate();
renderLeads();
