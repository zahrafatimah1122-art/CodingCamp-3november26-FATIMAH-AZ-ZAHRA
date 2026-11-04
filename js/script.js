// ===== Storage keys =====
const KEY_TRANSACTIONS = "ebv_transactions";
const KEY_CATEGORIES = "ebv_categories";
const KEY_THEME = "ebv_theme";
const KEY_SORT = "ebv_sort";

const DEFAULT_CATEGORIES = ["Food", "Transport", "Fun"];
const COLORS = [
  "#2ecc71", "#3498db", "#e67e22", "#9b59b6", "#e74c3c",
  "#1abc9c", "#f1c40f", "#34495e", "#fd79a8", "#95a5a6"
];

// ===== State =====
let transactions = load(KEY_TRANSACTIONS, []);
let categories = load(KEY_CATEGORIES, DEFAULT_CATEGORIES);
let chart = null;

// ===== DOM =====
const form = document.getElementById("transaction-form");
const nameInput = document.getElementById("item-name");
const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const formError = document.getElementById("form-error");
const listEl = document.getElementById("transaction-list");
const emptyState = document.getElementById("empty-state");
const balanceEl = document.getElementById("total-balance");
const sortSelect = document.getElementById("sort");
const newCategoryInput = document.getElementById("new-category");
const addCategoryBtn = document.getElementById("add-category");
const themeToggle = document.getElementById("theme-toggle");
const chartCanvas = document.getElementById("spending-chart");
const chartEmpty = document.getElementById("chart-empty");

// ===== Helpers =====
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // storage unavailable (e.g. private mode) - app still works for this session
  }
}

function formatMoney(n) {
  return "$" + n.toFixed(2);
}

function colorFor(category) {
  const i = categories.indexOf(category);
  return COLORS[(i < 0 ? 0 : i) % COLORS.length];
}

// ===== Categories =====
function renderCategories() {
  const current = categorySelect.value;
  categorySelect.innerHTML = "";
  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categorySelect.appendChild(opt);
  });
  if (categories.includes(current)) categorySelect.value = current;
}

function addCategory() {
  const value = newCategoryInput.value.trim();
  if (!value) return;
  const exists = categories.some((c) => c.toLowerCase() === value.toLowerCase());
  if (exists) {
    newCategoryInput.value = "";
    return;
  }
  categories.push(value);
  save(KEY_CATEGORIES, categories);
  newCategoryInput.value = "";
  renderCategories();
  categorySelect.value = value;
}

// ===== Transactions =====
function addTransaction(e) {
  e.preventDefault();
  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;

  if (!name || !amountInput.value || !category) {
    showError("Please fill in all fields.");
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    showError("Amount must be a number greater than 0.");
    return;
  }

  showError("");
  transactions.push({ id: Date.now(), name, amount, category });
  save(KEY_TRANSACTIONS, transactions);
  form.reset();
  categorySelect.value = category;
  render();
}

function deleteTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  save(KEY_TRANSACTIONS, transactions);
  render();
}

function showError(msg) {
  formError.textContent = msg;
  formError.hidden = !msg;
}

function sortedTransactions() {
  const list = [...transactions];
  switch (sortSelect.value) {
    case "amount-desc": return list.sort((a, b) => b.amount - a.amount);
    case "amount-asc": return list.sort((a, b) => a.amount - b.amount);
    case "category": return list.sort((a, b) => a.category.localeCompare(b.category));
    default: return list.sort((a, b) => b.id - a.id);
  }
}

// ===== Rendering =====
function renderList() {
  listEl.innerHTML = "";
  const items = sortedTransactions();
  emptyState.hidden = items.length > 0;

  items.forEach((t) => {
    const li = document.createElement("li");
    li.className = "transaction-item";

    const info = document.createElement("div");
    const nameEl = document.createElement("div");
    nameEl.className = "t-name";
    nameEl.textContent = t.name;
    const amountEl = document.createElement("div");
    amountEl.className = "t-amount";
    amountEl.textContent = formatMoney(t.amount);
    const tag = document.createElement("span");
    tag.className = "t-tag";
    tag.textContent = t.category;
    info.append(nameEl, amountEl, tag);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn btn-delete";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteTransaction(t.id));

    li.append(info, del);
    listEl.appendChild(li);
  });
}

function renderBalance() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  balanceEl.textContent = formatMoney(total);
}

function renderChart() {
  const totals = {};
  transactions.forEach((t) => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });
  const labels = Object.keys(totals);
  const data = labels.map((l) => totals[l]);
  const hasData = labels.length > 0;

  chartEmpty.hidden = hasData;
  chartCanvas.style.display = hasData ? "block" : "none";

  if (typeof Chart === "undefined") return; // CDN failed to load
  if (chart) chart.destroy();
  if (!hasData) { chart = null; return; }

  chart = new Chart(chartCanvas, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map(colorFor),
        borderColor: getComputedStyle(document.body).getPropertyValue("--card").trim(),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: getComputedStyle(document.body).getPropertyValue("--text").trim() }
        },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.label}: ${formatMoney(ctx.parsed)}` }
        }
      }
    }
  });
}

function render() {
  renderList();
  renderBalance();
  renderChart();
}

// ===== Theme =====
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  save(KEY_THEME, next);
  renderChart(); // refresh chart colors
}

// ===== Init =====
form.addEventListener("submit", addTransaction);
addCategoryBtn.addEventListener("click", addCategory);
newCategoryInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); addCategory(); }
});
sortSelect.addEventListener("change", () => {
  save(KEY_SORT, sortSelect.value);
  renderList();
});
themeToggle.addEventListener("click", toggleTheme);

sortSelect.value = load(KEY_SORT, "newest");
applyTheme(load(KEY_THEME, "light"));
renderCategories();
render();
