import type { SQSEvent } from 'aws-lambda';
import { writeMetric } from './CloudWatch';
import {
  ItemAlreadyProcessingError,
  writeFailedState,
  writeFinishedState,
  writeProcessingState,
} from './Processor/ItemAlreadyProcessingError';

export const TABLE_NAME_KEY = 'TABLE_NAME';

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


export const handler = async (event: SQSEvent) => {
  console.log('event', JSON.stringify(event, null, 2));
  const batchItemFailures = [];
  for (const record of event.Records) {
    const batch = JSON.parse(record.body);
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

      await writeFinishedState(item);
      await writeMetric('ItemProcessed', 1);
    }
  }
  return { batchItemFailures };
};
