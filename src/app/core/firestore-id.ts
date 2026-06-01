/** Firestore document IDs cannot contain `/`. */
export function toFirestoreDocumentId(raw: string): string {
  const sanitized = raw.replace(/\//g, '_').trim();
  if (!sanitized) {
    return 'unknown-place';
  }
  return sanitized.length <= 1500 ? sanitized : sanitized.slice(0, 1500);
}
