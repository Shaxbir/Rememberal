(() => {
  'use strict';

  const STORAGE_KEY = 'quicklist.lists.v1';
  const CATEGORIES = [
    'Other', 'Produce', 'Dairy', 'Meat & Seafood', 'Bakery',
    'Pantry', 'Frozen', 'Household', 'Personal Care'
  ];
  // ---- State -------------------------------------------------------------
   let state;
  let loadError = null;
  try {
    state = loadItems();
  } catch (error) {
    // A damaged stored record should not be silently overwritten.
    state = { lists: [], activeId: null };
    loadError = error.message;
  }
  let items = [];                
  let forgottenIds = new Set(); 

  // ---- Elements ----------------------------------------------------------
  const listForm = document.getElementById('new-list-form');
  const listNameInput = document.getElementById('new-list-name');
  const listTabs = document.getElementById('list-tabs');
  const archivedTabs = document.getElementById('rememberal-archive-tabs');
  const emptyState = document.getElementById('empty-state');
  const activeSection = document.getElementById('active-list');
  const activeTitle = document.getElementById('active-list-title');
  const renameBtn = document.getElementById('rename-list-button');
  const deleteBtn = document.getElementById('delete-list-button');
  const saveBtn = document.getElementById('save-list-button');
  const archiveBtn = document.getElementById('archive-list-button');
  const reopenBtn = document.getElementById('reopen-list-button');
  const clearAllBtn = document.getElementById('clear-all-button');
  const noticeEl = document.getElementById('operation-status');
  const errorEl = document.getElementById('error-message');
  const form = document.getElementById('add-item-form');
  const input = document.getElementById('item-name');
  const quantityInput = document.getElementById('item-quantity');
  const categoryInput = document.getElementById('item-category');
  const listEl = document.getElementById('item-list');
  const emptyMsg = document.getElementById('empty-list-message');
  const statusEl = document.getElementById('purchase-status');
  const progressEl = document.getElementById('progress');
  const allDoneBtn = document.getElementById('all-done-button');
  const clearBtn = document.getElementById('clear-purchased-button');
  const reminder = document.getElementById('reminder-dialog');
  const reminderIntro = document.getElementById('reminder-intro');
  const reminderList = document.getElementById('reminder-list');
  const returnBtn = document.getElementById('return-button');
  const finishBtn = document.getElementById('finish-button');

  // ---- Persistence -------------------------------------------------------
  function loadItems() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lists: [], activeId: null };

    let saved;
    try {
      saved = JSON.parse(raw);
    } catch {
      throw new Error('Saved lists could not be read. Existing data was not changed.');
    }
    if (!saved || !Array.isArray(saved.lists)) {
      throw new Error('Saved lists have an invalid format. Existing data was not changed.');
    }
    // Check data saved by this application before using it.
    for (const list of saved.lists) {
      if (!list || typeof list.id !== 'string' ||
          typeof list.name !== 'string' || !Array.isArray(list.items) ||
          typeof list.archived !== 'boolean') {
        throw new Error('Saved list data is invalid. Existing data was not changed.');
      }
      for (const item of list.items) {
        if (!item || typeof item.id !== 'string' ||
            typeof item.text !== 'string' || typeof item.purchased !== 'boolean') {
          throw new Error('Saved item data is invalid. Existing data was not changed.');
        }
      }
    }
    return {
      lists: saved.lists,
      activeId: typeof saved.activeId === 'string' ? saved.activeId : null
    };
  }

  function saveItems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getActive() {
    return state.lists.find(list => list.id === state.activeId) || null;
  }

  function syncItems() {
    // Repoint the original "items" variable at the currently opened list.
    items = getActive()?.items ?? [];
  }

  function makeId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function checkName(value, field) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Please enter a ${field}.`);
    }
    if (value.trim().length > 50) {
      throw new Error(`${field} must be 50 characters or fewer.`);
    }
    return value.trim();
  }

  function requireEditable() {
    const list = getActive();
    if (!list) throw new Error('Create or select a shopping list first.');
    if (list.archived) throw new Error('Reopen this archived list before editing.');
    return list;
  }

  function showNotice(message = '', isError = false) {
    noticeEl.textContent = isError ? '' : message;
    errorEl.textContent = isError ? message : '';
    errorEl.classList.toggle('hidden', !isError);
  }

  // Saves only successful edits. If saving fails, undo the edit rather than
  // telling the shopper it was saved when it was not.
  function change(action, message = '') {
    if (loadError) {
      showNotice(loadError, true);
      return false;
    }
    const previous = JSON.stringify(state);
    const oldForgotten = new Set(forgottenIds);
    try {
      action();
      persistAndRender();
      showNotice(message);
      return true;
    } catch (error) {
      state = JSON.parse(previous);
      forgottenIds = oldForgotten;
      syncItems();
      render();
      showNotice(error.message || 'That change could not be saved.', true);
      return false;
    }
  }

  // ---- Core logic --------------------------------------------------------
  const getUnpurchased = () => items.filter(i => !i.purchased);

  function allPurchased() {
    return items.length > 0 && getUnpurchased().length === 0;
  }

  function addItem(text, quantity = 1, category = 'Other') {
    requireEditable();
    const name = checkName(text, 'item name');
    const count = Number(quantity);
    if (!Number.isInteger(count) || count < 1 || count > 99) {
      throw new Error('Quantity must be a whole number between 1 and 99.');
    }
    // Original algorithm: add an object to the selected items array.
    items.push({ id: makeId(), text: name, purchased: false,
      quantity: count, category });
  }

  function togglePurchased(id) {
    requireEditable();
    const item = items.find(i => i.id === id);
    if (!item) throw new Error('Item not found.');
    if (item) item.purchased = !item.purchased;
    forgottenIds.delete(id);
  }

  function removeItem(id) {
    requireEditable();
    if (!items.some(i => i.id === id)) throw new Error('Item not found.');
    items = items.filter(i => i.id !== id);
    getActive().items = items;
    forgottenIds.delete(id);
  }

  function clearPurchased() {
    requireEditable();
    items = items.filter(i => !i.purchased); // Original clear algorithm.
    getActive().items = items;
    forgottenIds.clear();
  }

  function persistAndRender() {
    const active = getActive();
    if (active) active.updatedAt = new Date().toISOString();
    saveItems();
    render();
  }

   // ---- Multiple-list actions
     function createList(name) {
    const list = {
      id: makeId(), name: checkName(name, 'list name'),
      items: [], archived: false, updatedAt: new Date().toISOString()
    };
    state.lists.push(list);
    state.activeId = list.id;
    forgottenIds.clear();
    syncItems();
  }

  function openList(id) {
    if (!state.lists.some(list => list.id === id)) {
      throw new Error('That shopping list was not found.');
    }
    state.activeId = id;
    forgottenIds.clear();
    syncItems();
  }

  function renameList(name) {
    requireEditable().name = checkName(name, 'list name');
  }

  function archiveList() {
    requireEditable().archived = true;
    forgottenIds.clear();
  }

  function reopenList() {
    const list = getActive();
    if (!list || !list.archived) throw new Error('Select an archived list first.');
    list.archived = false;
  }

  function deleteList() {
    const current = getActive();
    if (!current) throw new Error('Select a shopping list first.');
    state.lists = state.lists.filter(list => list.id !== current.id);
    state.activeId = state.lists.find(list => !list.archived)?.id
      ?? state.lists[0]?.id ?? null;
    forgottenIds.clear();
    syncItems();
  }

  function clearAllItems() {
    requireEditable();
    items = [];
    getActive().items = items;
    forgottenIds.clear();
  }

  // ---- "All Done" flow ---------------------------------------------------
  // 1. Check for unpurchased items when All Done is selected.
  // 2. If any exist, display a reminder identifying each forgotten item.
  // 3. Otherwise, indicate that all items have been purchased.
  function handleAllDone() {
    hideComplete();
    if (!getActive() || getActive().archived) return;
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
    reminderIntro.textContent = missing.length === 1
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
    render();  // highlights forgotten items in the active list
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
  function renderTabs(target, lists) {
    target.innerHTML = '';
    if (!lists.length) {
      const li = document.createElement('li');
      li.className = 'rememberal-muted';
      li.textContent = 'No lists here yet.';
      target.appendChild(li);
      return;
    }
    lists.forEach(list => {
      const li = document.createElement('li');
      li.className = 'rememberal-tab';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rememberal-tab-button';
      button.dataset.listId = list.id;
      button.textContent = `${list.name} (${list.items.length})`;
      if (list.id === state.activeId) {
        button.classList.add('selected');
        button.setAttribute('aria-current', 'true');
      }
      li.append(button);
      target.appendChild(li);
    });
  }
  function render() {
    syncItems();
    renderTabs(listTabs, state.lists.filter(list => !list.archived));
    renderTabs(archivedTabs, state.lists.filter(list => list.archived));

    const current = getActive();
    emptyState.classList.toggle('hidden', !!current);
    activeSection.classList.toggle('hidden', !current);
    if (!current) return;

    const archived = current.archived;
    activeTitle.textContent = archived ? `${current.name} (Archived)` : current.name;
    form.classList.toggle('hidden', archived);
    renameBtn.classList.toggle('hidden', archived);
    saveBtn.classList.toggle('hidden', archived);
    archiveBtn.classList.toggle('hidden', archived);
    clearAllBtn.classList.toggle('hidden', archived);
    clearBtn.classList.toggle('hidden', archived);
    allDoneBtn.classList.toggle('hidden', archived);
    reopenBtn.classList.toggle('hidden', !archived);
    clearBtn.disabled = archived || !items.some(i => i.purchased);
    clearAllBtn.disabled = archived || items.length === 0;
    listEl.innerHTML = '';
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'item rememberal-item row';
      if (item.purchased) li.classList.add('purchased');
      if (forgottenIds.has(item.id) && !item.purchased) li.classList.add('forgotten');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `item-${item.id}`;
      checkbox.checked = item.purchased;
      checkbox.disabled = archived;
      checkbox.addEventListener('change', () => {
        change(() => togglePurchased(item.id));
      });

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.className = 'rememberal-item-name col-entry';
      label.textContent = item.text;
      const qty = document.createElement('span');
      qty.className = 'rememberal-item-quantity col-qty';
      qty.textContent = `Qty: ${item.quantity}`;
      const category = document.createElement('span');
      category.className = 'rememberal-item-category col-price';
      category.textContent = item.category || 'Other';

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove rememberal-remove';
      remove.setAttribute('aria-label', `Remove ${item.text}`);
      remove.textContent = '✕';
      remove.disabled = archived;
      remove.addEventListener('click', () => {
        if (window.confirm(`Remove "${item.text}"?`)) {
          change(() => removeItem(item.id), 'Item removed.');
        }
      });

      li.append(checkbox, label, qty, category, remove);
      listEl.appendChild(li);
    });

    emptyMsg.classList.toggle('hidden', items.length > 0);
    emptyMsg.textContent = archived
      ? 'This archived list has no items.'
      : 'This list is empty. Add your first item above.';

    const purchased = items.filter(i => i.purchased).length;
    const percent = items.length ? Math.round(purchased / items.length * 100) : 0;
    progressEl.textContent = `${purchased} of ${items.length} purchased (${percent}%)`;


    // Indicate when all items have been purchased
    if (allPurchased()) {
      showStatus('All items have been purchased.');
    } else {
      statusEl.classList.add('hidden');
      statusEl.hidden = true;
    }
  }

  function showStatus(message, isNeutral = false) {
    statusEl.textContent = message;
    statusEl.hidden = false;
    statusEl.classList.remove('hidden');    
    statusEl.style.background = isNeutral ? 'var(--warn-bg)' : '';
    statusEl.style.color = isNeutral ? 'var(--warn)' : '';
  }

  function showComplete(message) {
    showStatus(message);
  }

  function hideComplete() {
    statusEl.classList.add('hidden');
    statusEl.hidden = true;
    statusEl.style.background = '';
    statusEl.style.color = '';
  }

  // ---- Event wiring ------------------------------------------------------
  CATEGORIES.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryInput.appendChild(option);
  });

  listForm.addEventListener('submit', event => {
    event.preventDefault();
    if (change(() => createList(listNameInput.value), 'List created and saved.')) {
      listNameInput.value = '';
    }
  });

  function handleTabClick(event) {
    const button = event.target.closest('button[data-list-id]');
    if (button) change(() => openList(button.dataset.listId));
  }
  listTabs.addEventListener('click', handleTabClick);
  archivedTabs.addEventListener('click', handleTabClick);

  form.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  hideComplete();
  if (change(() => addItem(text, quantityInput.value, categoryInput.value), 'Item added and saved.')) {
    input.value = '';
    quantityInput.value = '1';
    input.focus();
  }
});

  allDoneBtn.addEventListener('click', handleAllDone);
  clearBtn.addEventListener('click', () => {
    if (window.confirm('Remove all purchased items?')) {
      change(clearPurchased, 'Purchased items removed.');
    }
  });
  clearAllBtn.addEventListener('click', () => {
    if (window.confirm('Remove every item from this list?')) {
      change(clearAllItems, 'All items removed.');
    }
  });

  renameBtn.addEventListener('click', () => {
    const list = getActive();
    if (!list || list.archived) return;
    const name = window.prompt('Rename this list:', list.name);
    if (name !== null) change(() => renameList(name), 'List renamed and saved.');
  });
  deleteBtn.addEventListener('click', () => {
    const list = getActive();
    if (list && window.confirm(`Permanently delete "${list.name}" and its items?`)) {
      change(deleteList, 'List deleted.');
    }
  });
  saveBtn.addEventListener('click', () => {
    if (getActive() && !getActive().archived) {
      change(() => {}, 'List saved on this device.');
    }
  });
  archiveBtn.addEventListener('click', () => {
    if (window.confirm('Archive this list? You can reopen it later.')) {
      change(archiveList, 'List archived. Its items are preserved.');
    }
  });
  reopenBtn.addEventListener('click', () => {
    change(reopenList, 'List reopened.');
  });

  returnBtn.addEventListener('click', event => {
    event.preventDefault(); returnToList(); 
  });
  finishBtn.addEventListener('click', event => { 
    event.preventDefault(); finishAnyway(); 
  });
  // Escape key also returns to the list
  reminder.addEventListener('cancel', event => { 
    event.preventDefault(); returnToList(); 
  });

  if (!state.lists.some(list => list.id === state.activeId)) {
    state.activeId = state.lists.find(list => !list.archived)?.id
      ?? state.lists[0]?.id ?? null;
  }
  render();
})();