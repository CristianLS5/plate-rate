export function isPermissionDenied(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  return (error as { code: string }).code === 'permission-denied';
}
