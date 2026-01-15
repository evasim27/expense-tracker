document.addEventListener("DOMContentLoaded", () => {
  if (typeof Auth !== 'undefined') {
    const user = Auth.getCurrent();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
      Auth.logout();
      window.location.href = 'login.html';
    });
  } else {
    console.error("Auth module ni naložen!");
    window.location.href = 'login.html';
    return;
  }

  const API_BASE = "http://localhost:8080";

  async function apiGet(path) {
    const user = Auth.getCurrent();
    const res = await fetch(`${API_BASE}${path}`, { headers: { "X-User": user } });
    if (!res.ok) throw new Error(`GET ${path} failed`);
    return res.json();
  }

  async function apiPost(path, body) {
    const user = Auth.getCurrent();
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "X-User": user, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`POST ${path} failed`);
    return res.json();
  }

  async function apiPut(path, body) {
    const user = Auth.getCurrent();
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: { "X-User": user, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`PUT ${path} failed`);
    return res.json();
  }

  async function apiDelete(path) {
    const user = Auth.getCurrent();
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: { "X-User": user }
    });
    if (!res.ok) throw new Error(`DELETE ${path} failed`);
    return res.json();
  }

  const $ = (selector) => document.querySelector(selector);
  const state = { categories: [], expenses: [], budgets: {}, filters: { category: '', month: '', text: '' } };

  const formatCurrency = (v) => `${Number(v || 0).toFixed(2)} €`;
  const formatDisplayDate = (iso) => {
    if (!iso) return '';
    const d = String(iso).slice(0, 10);
    const [y, m, d2] = d.split('-');
    return `${d2}.${m}.${y}`;
  };

  const categorySelect = $('#category');
  const filterCategory = $('#filter-category');
  const filterMonth = document.getElementById('filter-month');
  const filterText = document.getElementById('filter-text');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const expensesTbody = $('#expenses-tbody');
  const totalSpent = $('#total-spent');
  const totalMonth = $('#total-month');
  const totalCategories = $('#total-categories');
  const totalExpenses = $('#total-expenses');
  const budgetCard = document.getElementById('budget-card');
  const budgetThisMonthEl = document.getElementById('budget-this-month');
  const budgetRemainingEl = document.getElementById('budget-remaining');
  const byCategoryList = $('#by-category');
  const amountInput = $('#amount');
  const dateInput = $('#date');
  const noteInput = $('#note');
  const expenseForm = $('#expense-form');
  const saveExpenseBtn = $('#save-expense');
  const cancelEditBtn = $('#cancel-edit');
  const chartCat = document.getElementById("chart-by-category");
  const chartMonth = document.getElementById("chart-monthly");
  const categoryForm = document.getElementById('category-form');
  const newCategoryInput = document.getElementById('new-category');
  const categoryList = document.getElementById('category-list');
  const exportCsvBtn = document.getElementById('export-csv');

  let editingExpenseId = null;
  let catChart, monthChart;

  async function load() {
    const [cats, exps, buds] = await Promise.all([
      apiGet("/categories"),
      apiGet("/expenses"),
      apiGet("/budgets")
    ]);

    state.categories = cats.map(c => c.name);
    state.expenses = exps.map(e => ({
      id: e.id,
      date: (e.date || '').slice(0, 10),
      category: e.category || "Other",
      amount: parseFloat(e.amount),
      note: e.note || ""
    }));

    state.budgets = Object.fromEntries((buds || []).map(b => [b.month, Number(b.amount)]));

    renderCategoryOptions();
    renderCategoryList();
    renderExpenses();
    renderSummary();
    updateCharts();
  }

  function renderCategoryOptions() {
    const opts = state.categories.map(c => `<option value="${c}">${c}</option>`).join('');
    categorySelect.innerHTML = `<option value="" disabled selected>Select…</option>${opts}`;
    filterCategory.innerHTML = `<option value="">All categories</option>${opts}`;
  }

  function renderCategoryList() {
    if (!categoryList) return;
    const items = state.categories
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .map(c => `<li class="pill">${c} <button type="button" class="remove btn" data-cat="${c}">✕</button></li>`) // pill with delete button
      .join('');
    categoryList.innerHTML = items || '<li class="muted">No categories</li>';

    categoryList.querySelectorAll('.remove').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const name = btn.getAttribute('data-cat');
        if (!name) return;
        if (!confirm(`Delete category "${name}"?`)) return;
        try {
          await apiDelete(`/categories/${encodeURIComponent(name)}`);
          state.categories = state.categories.filter(x => x !== name);
          state.expenses = state.expenses.map(e => e.category === name ? { ...e, category: 'Other' } : e);
          renderCategoryOptions();
          renderCategoryList();
          renderExpenses();
          renderSummary();
          updateCharts();
          renderByCategory();
        } catch (e) {
          console.error('Failed to delete category', e);
          alert('Failed to delete category. Please check server connection.');
        }
      });
    });
  }

  function renderExpenses() {
    expensesTbody.innerHTML = '';
    let subtotal = 0;

    const filtered = state.expenses.filter(e => {
      if (state.filters.category && e.category !== state.filters.category) return false;
      if (state.filters.month && String(e.date).slice(0,7) !== state.filters.month) return false;
      if (state.filters.text && !String(e.note||'').toLowerCase().includes(state.filters.text)) return false;
      return true;
    });

    filtered.forEach(e => {
      subtotal += Number(e.amount || 0);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDisplayDate(e.date)}</td>
        <td>${e.category}</td>
        <td class="right">${formatCurrency(e.amount)}</td>
        <td>${e.note || ''}</td>
        <td class="right">
          <button class="btn" data-act="edit" data-id="${e.id}">Edit</button>
          <button class="btn" data-act="del" data-id="${e.id}">Delete</button>
        </td>
      `;
      tr.querySelector('[data-act="edit"]').onclick = () => beginEditExpense(e.id);
      tr.querySelector('[data-act="del"]').onclick = () => deleteExpense(e.id);
      expensesTbody.appendChild(tr);
    });

    totalExpenses.textContent = state.expenses.length;
    totalSpent.textContent = formatCurrency(subtotal);
    const filteredTotalEl = document.getElementById('filtered-total');
    if (filteredTotalEl) filteredTotalEl.textContent = formatCurrency(subtotal);
    renderByCategory();
  }

  function renderSummary() {
    const total = state.expenses.reduce((s, e) => s + e.amount, 0);
    totalSpent.textContent = formatCurrency(total);
    totalCategories.textContent = state.categories.length;

    const ymNow = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthTotal = state.expenses
      .filter(e => String(e.date).slice(0, 7) === ymNow)
      .reduce((s, e) => s + e.amount, 0);
    totalMonth.textContent = formatCurrency(monthTotal);

    const budget = state.budgets[ymNow] || 0;
    if (budgetThisMonthEl) budgetThisMonthEl.textContent = formatCurrency(budget);
    if (budgetRemainingEl) budgetRemainingEl.textContent = formatCurrency(budget - monthTotal);
  }

  function renderByCategory() {
    if (!byCategoryList) return;
    const agg = {};
    for (const e of state.expenses) {
      const key = e.category || 'Other';
      agg[key] = (agg[key] || 0) + Number(e.amount || 0);
    }
    const rows = Object.entries(agg)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amt]) => `<li><span>${name}</span><span class="amount">${formatCurrency(amt)}</span></li>`)
      .join('');
    byCategoryList.innerHTML = rows || '<li class="muted">No data</li>';
  }

  function updateCharts() {
    if (!chartCat || !chartMonth) return;

    const byCat = {};
    for (const e of state.expenses) {
      byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    }

    const byMonth = {};
    for (const e of state.expenses) {
      const ym = e.date.slice(0, 7);
      byMonth[ym] = (byMonth[ym] || 0) + e.amount;
    }

    const catLabels = Object.keys(byCat);
    const catValues = Object.values(byCat);
    const monthLabels = Object.keys(byMonth).sort();
    const monthValues = monthLabels.map(m => byMonth[m]);

    if (catChart) catChart.destroy();
    if (monthChart) monthChart.destroy();

    catChart = new Chart(chartCat, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catValues,
          backgroundColor: ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#22c55e', '#a855f7', '#f97316']
        }]
      },
      options: { plugins: { legend: { position: 'bottom' } } }
    });

    monthChart = new Chart(chartMonth, {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [{
          label: 'Poraba (€)',
          data: monthValues,
          backgroundColor: '#6366f1'
        }]
      },
      options: {
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false } }
      }
    });
  }

  async function addExpense(payload) {
    const rec = await apiPost("/expenses", payload);
    state.expenses.unshift({
      id: rec.id,
      date: (rec.date || '').slice(0, 10),
      category: rec.category,
      amount: parseFloat(rec.amount),
      note: rec.note || ""
    });
    renderExpenses();
    renderSummary();
    updateCharts();
    renderByCategory();
  }

  async function saveEditedExpense(payload) {
    const rec = await apiPut(`/expenses/${editingExpenseId}`, payload);
    const normalized = {
      id: rec.id,
      date: (rec.date || '').slice(0, 10),
      category: rec.category || "Other",
      amount: parseFloat(rec.amount),
      note: rec.note || ""
    };
    const idx = state.expenses.findIndex(e => e.id === editingExpenseId);
    if (idx >= 0) state.expenses[idx] = normalized;
    editingExpenseId = null;
    saveExpenseBtn.textContent = "Add Expense";
    cancelEditBtn.style.display = "none";
    expenseForm.reset();
    renderExpenses();
    renderSummary();
    updateCharts();
    renderByCategory();
  }

  async function deleteExpense(id) {
    if (!confirm("Delete this expense?")) return;
    await apiDelete(`/expenses/${id}`);
    state.expenses = state.expenses.filter(e => e.id !== id);
    renderExpenses();
    renderSummary();
    updateCharts();
    renderByCategory();
  }

  function beginEditExpense(id) {
    const e = state.expenses.find(x => x.id === id);
    if (!e) return;
    editingExpenseId = id;
    amountInput.value = e.amount;
    dateInput.value = e.date;
    categorySelect.value = e.category;
    noteInput.value = e.note;
    saveExpenseBtn.textContent = "Save Changes";
    cancelEditBtn.style.display = "";
  }

  expenseForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const payload = {
      amount: parseFloat(amountInput.value),
      date: dateInput.value,
      category: categorySelect.value,
      note: noteInput.value
    };
    if (editingExpenseId) await saveEditedExpense(payload);
    else await addExpense(payload);
    expenseForm.reset();
  });

  cancelEditBtn.onclick = () => {
    editingExpenseId = null;
    saveExpenseBtn.textContent = "Add Expense";
    cancelEditBtn.style.display = "none";
    expenseForm.reset();
  };

  if (filterCategory) {
    filterCategory.addEventListener('change', () => {
      state.filters.category = filterCategory.value || '';
      renderExpenses();
    });
  }
  if (filterMonth) {
    filterMonth.addEventListener('change', () => {
      state.filters.month = filterMonth.value || '';
      renderExpenses();
    });
  }
  if (filterText) {
    filterText.addEventListener('input', () => {
      state.filters.text = (filterText.value || '').trim().toLowerCase();
      renderExpenses();
    });
  }
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      state.filters = { category: '', month: '', text: '' };
      if (filterCategory) filterCategory.value = '';
      if (filterMonth) filterMonth.value = '';
      if (filterText) filterText.value = '';
      renderExpenses();
    });
  }

  if (budgetCard) {
    budgetCard.addEventListener('click', async () => {
      const ymNow = new Date().toISOString().slice(0, 7);
      const current = state.budgets[ymNow] || 0;
      const input = prompt(`Set budget for ${ymNow} (in €)`, current ? String(current) : "");
      if (input == null) return;
      const amount = Number(input);
      if (!isFinite(amount) || amount < 0) return alert('Please enter a valid non-negative number.');
      try {
        await apiPost('/budgets', { month: ymNow, amount });
        state.budgets[ymNow] = amount;
        renderSummary();
      } catch (e) {
        console.error('Failed to set budget', e);
        alert('Failed to set budget.');
      }
    });
  }

  function toCsvValue(v) {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadCsv(filename, content) {
    const blob = new Blob(["\uFEFF" + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      const header = ['Date','Category','Amount','Note'];
      const rows = state.expenses.map(e => [
        (e.date || '').slice(0,10),
        e.category || 'Other',
        Number(e.amount || 0).toFixed(2),
        e.note || ''
      ]);
      const lines = [header, ...rows]
        .map(cols => cols.map(toCsvValue).join(','))
        .join('\n');
      const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
      downloadCsv(`expenses-${ts}.csv`, lines);
    });
  }

  if (categoryForm) {
    categoryForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const name = String(newCategoryInput.value || '').trim();
      if (!name) return;
      try {
        const rec = await apiPost('/categories', { name });
        const addedName = rec && rec.name ? rec.name : name;
        if (!state.categories.includes(addedName)) {
          state.categories.push(addedName);
          renderCategoryOptions();
          renderCategoryList();
        }
        newCategoryInput.value = '';
      } catch (e) {
        console.error('Failed to add category', e);
      }
    });
  }

  (async () => {
    await load();
  })();
});