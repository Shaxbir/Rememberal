//manages multiple shopping lists and their items

// Imports functions from models.js to create lists and validate names.
import { createList, cleanText, MAX_LIST_NAME } from './models.js';

// Imports the original shopping list functions from rememberal.js.
import {
  addItem as originalAddItem, togglePurchased as originalTogglePurchased,
  removeItem as originalRemoveItem, clearPurchased as originalClearPurchased,
  getUnpurchased as originalGetUnpurchased, allPurchased as originalAllPurchased
} from './rememberal.js';

// Manages multiple shopping lists by calling the original item functions
// from rememberal.js only currently selected list is modified.
export class ListManager {
  constructor({ lists = [], activeId = null } = {}) {
    this.lists = lists;
    this.activeId = lists.some(list => list.id === activeId)
      ? activeId : (lists.find(list => !list.archived)?.id ?? lists[0]?.id ?? null);
  }

  snapshot() { return { lists: this.lists, activeId: this.activeId }; }
  getActive() { return this.lists.find(list => list.id === this.activeId) ?? null; }
  getLists(archived = false) { return this.lists.filter(list => list.archived === archived); }
  touch(list) { list.updatedAt = new Date().toISOString(); }

 // Checks whether the selected shopping list can be edited and
 // prevents changes when no list is selected or a list is archived
  requireEditable() {
    const list = this.getActive();
    if (!list) throw new Error('Create or select a shopping list first.');
    if (list.archived) throw new Error('Reopen this archived list before editing it.');
    return list;
  }

  // Creates a new shopping list using models.js.
  createList(name) {
    const list = createList(name);
    this.lists.push(list);
    this.activeId = list.id;
  }

 
  openList(id) {
    if (!this.lists.some(list => list.id === id)) throw new Error('That list could not be found.');
    this.activeId = id;
  }

  // Adds an item to the currently selected shopping list.
  // Quantity and category are optional and have default values
  addItem(text, quantity = 1, category = 'Other') {
    const list = this.requireEditable();
    originalAddItem(list.items, text, quantity, category);
    this.touch(list);
  }

  // Marks an item as purchased or unpurchased
  togglePurchased(id) {
    const list = this.requireEditable();
    if (!originalTogglePurchased(list.items, id)) throw new Error('Item not found.');
    this.touch(list);
  }

  // Removes a selected item from the shopping list.
  removeItem(id) {
    const list = this.requireEditable();
    if (!list.items.some(i => i.id === id)) throw new Error('Item not found.');
    list.items = originalRemoveItem(list.items, id);
    this.touch(list);
  }

  // Removes every item that has been marked as purchased.
  clearPurchased() {
    const list = this.requireEditable();
    list.items = originalClearPurchased(list.items);
    this.touch(list);
  }

  // Returns items that have not been purchased.
  getUnpurchased() {
    return originalGetUnpurchased(this.getActive()?.items ?? []);
  }

  // Checks whether every item in the selected list is purchased.
  allPurchased() {
    return originalAllPurchased(this.getActive()?.items ?? []);
  }

  // Removes every item from the selected shopping list.
  clearAllItems() {
    const list = this.requireEditable();
    list.items = [];
    this.touch(list);
  }

  // Changes the name of the selected shopping list uses models.js to validate the new name.
  renameActive(name) {
    const list = this.requireEditable();
    list.name = cleanText(name, 'List name', MAX_LIST_NAME);
    this.touch(list);
  }

  // Archives the selected shopping list.
  archiveActive() {
    const list = this.requireEditable();
    list.archived = true;
    this.touch(list);
  }

  // Reopens an archived shopping list so it can be edited again.
  reopenActive() {
    const list = this.getActive();
    if (!list || !list.archived) throw new Error('Select an archived list first.');
    list.archived = false;
    this.touch(list);
  }

  // Permanently removes the selected shopping list.
  deleteActive() {
    const current = this.getActive();
    if (!current) throw new Error('Select a list to delete.');
    this.lists = this.lists.filter(list => list.id !== current.id);
    this.activeId = this.lists.find(list => !list.archived)?.id ?? this.lists[0]?.id ?? null;
  }

   // Calculates how many items have been purchased.
  getProgress() {
    const items = this.getActive()?.items ?? [];
    const purchased = items.filter(i => i.purchased).length;
    return { purchased, total: items.length,
      percent: items.length ? Math.round(purchased / items.length * 100) : 0 };
  }
}
