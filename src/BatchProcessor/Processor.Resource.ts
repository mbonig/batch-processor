import type { SQSEvent } from 'aws-lambda';
import { writeMetric } from './CloudWatch';
import { Batch, Item } from './Item';
import {
  ItemAlreadyProcessingError,
  removeProcessingState,
  writeFailedState,
  writeProcessingState,
} from './Processor/ItemAlreadyProcessingError';


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

export const handler = async (event: SQSEvent | Batch) => {
  console.log('event', JSON.stringify(event, null, 2));
  const batchItemFailures = [];
  if ('Records' in event) {
    for (const record of event.Records) {
      const batch: Item[] = JSON.parse(record.body);
      for (const item of batch) {
        console.info('Processing item:', item.itemId);
        try {
          await writeProcessingState(item);
          // going to temporarily recall this function to force the reprocessing state for testing
          // await writeProcessingState(item);

        } catch (err) {
          if (err instanceof ItemAlreadyProcessingError) {
            console.warn('Item already processing:', err);
            await writeMetric('ItemAlreadyProcessing', 1);
            continue;
          }
        }
        try {
          // simulating actual work
          await delay(item.value);
        } catch (err: any) {
          console.error('Error processing item:', err);
          // ok, so an error occurred during processing
          await writeMetric('ItemFailedProcessing', 1);
          // let's update the state to failed
          await writeFailedState(item, err);
          // let's also report this back so that proper failed message handling can be done
          batchItemFailures.push({ itemIdentifier: record.messageId });
        }
        await removeProcessingState(item);
        await writeMetric('ItemProcessed', 1);
      }
    }
    return { batchItemFailures };
  } else if ('Items' in event) {
    for (const item of event.Items) {
      try {
        await processItem(item);
      } catch (err) {
        console.error('Error processing item:', item);
      }
    }
    return event.Items;

  }

  return {};

};
