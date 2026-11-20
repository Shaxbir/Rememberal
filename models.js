// Data structures and validation added to support more than one shopping list.

// Limits the number of characters users can enter for list and item names.
export const MAX_LIST_NAME = 50;
export const MAX_ITEM_NAME = 50;

// Creates a unique ID for each shopping list or item.
export function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Uses the browser's built-in UUID generator if available, if unavailable creates an ID
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Checks that the user entered valid text.
export function cleanText(value, name, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Please enter a ${name.toLowerCase()}.`);
  }
  const text = value.trim();
  if (text.length > maxLength) throw new Error(`${name} must be ${maxLength} characters or fewer.`);
  return text;
}

// Creates a new shopping list with its own information, each list starts empty and is archived
export function createList(name) {
  return {
    id: makeId(),
    name: cleanText(name, 'List name', MAX_LIST_NAME),
    items: [],
    archived: false,
    updatedAt: new Date().toISOString()
  };
}

// Creates a shopping list item with a name, quantity, and category.
export function createItem(text, quantity = 1, category = 'Other') {
  const count = Number(quantity);
  if (!Number.isInteger(count) || count < 1 || count > 99) {
    throw new Error('Quantity must be a whole number from 1 to 99.');
  }
  return {
    id: makeId(),
    text: cleanText(text, 'Item', MAX_ITEM_NAME),
    purchased: false,
    // These two extend the original item structure for the existing form.
    quantity: count,
    category: typeof category === 'string' ? category.trim().slice(0, 50) || 'Other' : 'Other'
  };
}

//This is a checker to check saved shopping list before loading them into application.
export function normalizeStoredList(entry) {
  if (!entry || typeof entry !== 'object' || !entry.id ||
      typeof entry.name !== 'string' || !entry.name.trim()) return null;
  const seenItems = new Set();
  const items = Array.isArray(entry.items) ? entry.items : [];
  return {
    id: String(entry.id),
    name: entry.name.trim().slice(0, MAX_LIST_NAME),
    archived: entry.archived === true,
    updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : '',
    items: items.map(item => {
      if (!item || typeof item !== 'object') return null;
      const text = typeof item.text === 'string' ? item.text : item.description;
      if (!item.id || typeof text !== 'string' || !text.trim()) return null;
      const id = String(item.id);
      if (seenItems.has(id)) return null;
      seenItems.add(id);
      const count = Number(item.quantity);
      return {
        id,
        text: text.trim().slice(0, MAX_ITEM_NAME),
        purchased: item.purchased === true,
        quantity: Number.isInteger(count) && count >= 1 && count <= 99 ? count : 1,
        category: typeof item.category === 'string' ? item.category.slice(0, 50) : 'Other'
      };
    }).filter(Boolean)
  };
}
