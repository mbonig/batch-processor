export interface Item {
  batchId: string;
  itemId: string;
  value: number;
}

export type Batch = {
  Items: Item[];
};
