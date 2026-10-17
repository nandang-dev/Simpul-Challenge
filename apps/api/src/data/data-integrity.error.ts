export class DataIntegrityError extends Error {
  constructor(readonly issues: string[]) {
    super(`Inventory data integrity error:\n${issues.map((issue) => `- ${issue}`).join('\n')}`);
    this.name = 'DataIntegrityError';
  }
}