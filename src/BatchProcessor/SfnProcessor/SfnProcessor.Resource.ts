import { writeMetric } from '../CloudWatch';
import { Batch, Item } from '../Item';


export const TABLE_NAME_KEY = 'TABLE_NAME';
export const POLLING_QUEUE_URL_KEY = 'POLLING_QUEUE_URL';
export const PROCESSING_QUEUE_URL_KEY = 'PROCESSING_QUEUE_URL';

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


async function processItem(item: Item) {
  console.info('Processing item:', item.itemId);
  // simulating actual work
  await delay(item.value);
  await writeMetric('ItemProcessed', 1);
}

export const handler = async (event: Batch) => {
  console.log('event', JSON.stringify(event, null, 2));
  for (const item of event.Items) {
    try {
      await processItem(item);
    } catch (err) {
      console.error('Error processing item:', item);
    }
  }
  return event.Items;


};
