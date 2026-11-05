(() => {
  'use strict';

  const STORAGE_KEY = 'shopping-list-items';

  // ---- State -------------------------------------------------------------
  let items = loadItems();       // [{ id, text, purchased }]
  let forgottenIds = new Set();  // items highlighted after the reminder

  // ---- Elements ----------------------------------------------------------
  const form = document.getElementById('add-form');
  const input = document.getElementById('item-input');
  const listEl = document.getElementById('item-list');
  const emptyMsg = document.getElementById('empty-msg');
  const statusEl = document.getElementById('status');
  const allDoneBtn = document.getElementById('all-done-btn');
  const clearBtn = document.getElementById('clear-purchased-btn');
  const completeView = document.getElementById('complete-view');
  const completeText = document.getElementById('complete-text');
  const newListBtn = document.getElementById('new-list-btn');
  const reminder = document.getElementById('reminder');
  const reminderIntro = document.getElementById('reminder-intro');
  const reminderList = document.getElementById('reminder-list');
  const returnBtn = document.getElementById('return-btn');
  const finishBtn = document.getElementById('finish-btn');

  // ---- Persistence -------------------------------------------------------
  function loadItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveItems() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) { /* storage unavailable; keep working in memory */ }
  }

  // ---- Core logic --------------------------------------------------------
  const getUnpurchased = () => items.filter(i => !i.purchased);

  function allPurchased() {
    return items.length > 0 && getUnpurchased().length === 0;
  }

  function addItem(text) {
    items.push({ id: Date.now() + Math.random(), text, purchased: false });
    persistAndRender();
  }

  function togglePurchased(id) {
    const item = items.find(i => i.id === id);
    if (item) item.purchased = !item.purchased;
    forgottenIds.delete(id);
    persistAndRender();
  }

  function removeItem(id) {
    items = items.filter(i => i.id !== id);
    forgottenIds.delete(id);
    persistAndRender();
  }

  function clearPurchased() {
    items = items.filter(i => !i.purchased);
    persistAndRender();
  }

  function persistAndRender() {
    saveItems();
    render();
  }

  // ---- "All Done" flow ---------------------------------------------------
  // 1. Check for unpurchased items when All Done is selected.
  // 2. If any exist, display a reminder identifying each forgotten item.
  // 3. Otherwise, indicate that all items have been purchased.
  function handleAllDone() {
    hideComplete();

    if (items.length === 0) {
      showStatus('Your list is empty. Add items before finishing.', true);
      return;
    }

    const missing = getUnpurchased();
    if (missing.length > 0) {
      showReminder(missing);
    } else {
      showComplete('All items have been purchased.');
    }
  }

  function showReminder(missing) {
    reminderIntro.textContent =
      missing.length === 1
        ? 'This item has not been purchased yet:'
        : `These ${missing.length} items have not been purchased yet:`;

    reminderList.innerHTML = '';
    missing.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item.text;
      reminderList.appendChild(li);
    });

    forgottenIds = new Set(missing.map(i => i.id));
    reminder.showModal();
  }

  // 4. Allow return to the active list from the reminder.
  function returnToList() {
    reminder.close();
    render(); // highlights forgotten items in the active list
    const firstForgotten = listEl.querySelector('.item.forgotten input');
    if (firstForgotten) firstForgotten.focus();
  }

  function finishAnyway() {
    const count = forgottenIds.size;
    reminder.close();
    forgottenIds = new Set();
    render();
    showComplete(
      `Finished with ${count} item${count === 1 ? '' : 's'} not purchased.`
    );
  }

  // ---- Rendering ---------------------------------------------------------
  function render() {
    listEl.innerHTML = '';

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'item';
      if (item.purchased) li.classList.add('purchased');
      if (forgottenIds.has(item.id) && !item.purchased) li.classList.add('forgotten');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `item-${item.id}`;
      checkbox.checked = item.purchased;
      checkbox.addEventListener('change', () => togglePurchased(item.id));

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = item.text;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove';
      remove.setAttribute('aria-label', `Remove ${item.text}`);
      remove.textContent = '✕';
      remove.addEventListener('click', () => removeItem(item.id));

      li.append(checkbox, label, remove);
      listEl.appendChild(li);
    });

    emptyMsg.hidden = items.length > 0;
    clearBtn.disabled = !items.some(i => i.purchased);

    // Indicate when all items have been purchased
    if (allPurchased()) {
      showStatus('All items have been purchased.');
    } else {
      statusEl.hidden = true;
    }
  }

  function showStatus(message, isNeutral = false) {
    statusEl.textContent = message;
    statusEl.hidden = false;
    statusEl.style.background = isNeutral ? 'var(--warn-bg)' : '';
    statusEl.style.color = isNeutral ? 'var(--warn)' : '';
  }

  function showComplete(message) {
    completeText.textContent = message;
    completeView.hidden = false;
  }

  function hideComplete() {
    completeView.hidden = true;
  }

  // ---- Event wiring ------------------------------------------------------
  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    hideComplete();
    addItem(text);
    input.value = '';
    input.focus();
  });

  allDoneBtn.addEventListener('click', handleAllDone);
  clearBtn.addEventListener('click', clearPurchased);
  newListBtn.addEventListener('click', () => { hideComplete(); input.focus(); });

  returnBtn.addEventListener('click', e => { e.preventDefault(); returnToList(); });
  finishBtn.addEventListener('click', e => { e.preventDefault(); finishAnyway(); });
  // Escape key also returns to the list
  reminder.addEventListener('cancel', e => { e.preventDefault(); returnToList(); });

  render();
})();