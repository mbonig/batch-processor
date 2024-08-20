export interface Item {
  batchId: string;
  itemId: string;
  value: number;
  status?: 'processing' | 'failed' | 'finished';
}

export type Batch = Item[];
