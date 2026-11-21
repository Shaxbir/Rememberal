// Defines shopping list and item data, plus input validation
export const MAX_LIST_NAME = 50;
export const MAX_ITEM_NAME = 50;

// Unique ID lets us find a specific list or item
export function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Checks for empty text and keep name in char limit
export function cleanText(value, name, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Please enter a ${name.toLowerCase()}.`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw new Error(`${name} must be ${maxLength} characters or fewer.`);
  }
  return text;
}

// Creates new list. Lists start empty and are not archived.
export function createList(name) {
  return {
    id: makeId(),
    name: cleanText(name, 'List name', MAX_LIST_NAME),
    items: [],
    archived: false,
    updatedAt: new Date().toISOString()
  };
}

// Creates a shopping item, adding quantity and category
export function createItem(text, quantity = 1, category = 'Other') {
  const count = Number(quantity);
  if (!Number.isInteger(count) || count < 1 || count > 99) {
    throw new Error('Quantity must be a whole number from 1 to 99.');
  }
  return {
    id: makeId(),
    text: cleanText(text, 'Item', MAX_ITEM_NAME),
    purchased: false,
    quantity: count,
    category: typeof category === 'string'
      ? category.trim().slice(0, 50) || 'Other'
      : 'Other'
  };
}

// Validates shopping lists read back from browser storage.
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
      const text = item.text;
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
        category: typeof item.category === 'string'
          ? item.category.trim().slice(0, 50) || 'Other'
          : 'Other'
      };
    }).filter(Boolean)
  };
}
