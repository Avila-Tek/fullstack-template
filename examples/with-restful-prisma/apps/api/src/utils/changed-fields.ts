/**
 * Utility function to determine which fields have changed between two objects
 * @param existing The existing object in the database
 * @param updated The updated object with potentially new values
 * @param fieldsToCompare Array of field names to compare
 * @returns Array of field names that have changed
 */
export function getChangedFields<T>(
  existing: T,
  updated: Partial<T>,
  fieldsToCompare: (keyof T)[]
) {
  console.log('Existing:', existing);
  console.log('Updated:', updated);

  return fieldsToCompare.filter((field: any) => {
    const oldValue = existing[field as keyof T];
    const newValue = updated[field as keyof T];

    if (field === 'reviewers') {
      console.log(existing, updated);
      console.log('Comparing reviewers:', {
        oldValue,
        newValue,
      });
    }

    // Special handling for null/undefined values to avoid false positives
    if (
      (oldValue === null || oldValue === undefined) &&
      (newValue === null || newValue === undefined)
    ) {
      return false; // Both are null/undefined, so consider them equal
    }

    // Handle empty arrays as equivalent to null/undefined
    if (
      Array.isArray(oldValue) &&
      oldValue.length === 0 &&
      (newValue === null || newValue === undefined)
    ) {
      return false;
    }

    if (
      Array.isArray(newValue) &&
      newValue.length === 0 &&
      (oldValue === null || oldValue === undefined)
    ) {
      return false;
    }

    return JSON.stringify(oldValue) !== JSON.stringify(newValue);
  });
}
