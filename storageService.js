// Saves and loads Rememberal shopping lists
import { normalizeStoredList } from './models.js';

// A single storage key holds all lists
export const STORAGE_KEY = 'quicklist.lists.v1';

export class StorageService {
  // The difference is that we now store multiple named lists.
  loadItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      // A new user begins with no saved lists.
      if (!raw) return { lists: [], activeId: null };

      const parsed = JSON.parse(raw);
      const entries = parsed?.lists;
      if (!Array.isArray(entries)) {
        throw new Error('Invalid saved list format.');
      }

      // Validate each list and ignore duplicate IDs
      const seen = new Set();
      const lists = entries.map(normalizeStoredList).filter(list => {
        if (!list || seen.has(list.id)) return false;
        seen.add(list.id);
        return true;
      });

      return {
        lists,
        activeId: typeof parsed.activeId === 'string' ? parsed.activeId : null
      };
    } catch (error) {
      // Do not quietly replace broken saved data with an empty collection
      throw new Error(`Unable to load saved lists: ${error.message}. Existing data was not erased.`);
    }
  }

  saveItems(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      throw new Error('Unable to save on this device. Check browser storage permissions.');
    }
  }
}
