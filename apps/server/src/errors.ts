import type { ErrorCode } from '@fdp/protocol';

export class ServerError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ServerError';
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Erro interno.';
}
