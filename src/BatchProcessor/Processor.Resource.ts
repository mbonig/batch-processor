import { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBStreamEvent } from 'aws-lambda';
import { writeMetric } from './CloudWatch';
import { Item } from './Item';
import { removeProcessingState } from './Processor/ItemAlreadyProcessingError';


export const TABLE_NAME_KEY = 'TABLE_NAME';

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

export const handler = async (event: DynamoDBStreamEvent | Item) => {
  console.log('event', JSON.stringify(event, null, 2));
  const batchItemFailures = [];
  if ('Records' in event) {
    for (const record of event.Records) {
      if (record.eventName !== 'INSERT') {
        // we only care about inserts here.
        continue;
      }
      const streamRecord = record.dynamodb?.NewImage!;
      const unmarshalledRecord: any = unmarshall(streamRecord as { [key: string]: AttributeValue }) as Item;
      const item = {
        itemId: unmarshalledRecord.sk,
        batchId: unmarshalledRecord.pk,
        value: unmarshalledRecord.value,
      };

      if (!item) {
        console.error('We did not get a new image for the record:', record);
        continue;
      }
      try {
        await processItem(item);
        await removeProcessingState(item);
      } catch (err) {
        batchItemFailures.push({ itemIdentifier: record.dynamodb?.SequenceNumber });
      }
    }
    return { batchItemFailures };
  } else {
    console.error('Unknown incoming event: ', event);
    throw new Error('Unknown incoming event');
  }

};
