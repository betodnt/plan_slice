export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const value = error as { message?: unknown; error?: unknown };

    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message;
    }

    if (typeof value.error === 'string' && value.error.trim()) {
      return value.error;
    }

    if (
      typeof value.error === 'object' &&
      value.error !== null &&
      'message' in value.error &&
      typeof (value.error as { message?: unknown }).message === 'string'
    ) {
      return (value.error as { message: string }).message;
    }
  }

  return String(error);
}
