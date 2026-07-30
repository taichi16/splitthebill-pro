import localforage from 'localforage';

// Configure a dedicated localforage instance for storing photos
const photoStore = localforage.createInstance({
  name: 'SplitTheBillProPhotos',
  storeName: 'expense_photos'
});

/**
 * Retrieve photos (Base64 data URLs) associated with an expense ID.
 * @param {string} expenseId 
 * @returns {Promise<Array<string>>}
 */
export async function getExpensePhotos(expenseId) {
  try {
    const photos = await photoStore.getItem(expenseId);
    return photos || [];
  } catch (error) {
    console.error('Failed to get photos from IndexedDB:', error);
    return [];
  }
}

/**
 * Save photos (Base64 data URLs) for a specific expense ID.
 * @param {string} expenseId 
 * @param {Array<string>} photos 
 * @returns {Promise<void>}
 */
export async function saveExpensePhotos(expenseId, photos) {
  try {
    await photoStore.setItem(expenseId, photos);
  } catch (error) {
    console.error('Failed to save photos to IndexedDB:', error);
  }
}

/**
 * Delete photos associated with an expense ID.
 * @param {string} expenseId 
 * @returns {Promise<void>}
 */
export async function deleteExpensePhotos(expenseId) {
  try {
    await photoStore.removeItem(expenseId);
  } catch (error) {
    console.error('Failed to delete photos from IndexedDB:', error);
  }
}

/**
 * Helper to convert a File object (from file input/camera) to a Base64 data URL.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
