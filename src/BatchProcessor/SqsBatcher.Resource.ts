import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Item } from './Item';

const client = new SQSClient({});
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const TABLE_NAME_KEY = 'TABLE_NAME';
export const POLLING_QUEUE_URL_KEY = 'POLLING_QUEUE_URL';
export const PROCESSING_QUEUE_URL_KEY = 'PROCESSING_QUEUE_URL';

export const handler = async (event: any) => {

  console.log('event', JSON.stringify(event, null, 2));
  const count = +event.count || 1;
  const batchSize = +event.batchSize || 10;
  const batchId = `batch-${uuidv4()}`;

  // send a message on the queue to check if the batch is complete.
  await client.send(new SendMessageCommand({
    QueueUrl: process.env[POLLING_QUEUE_URL_KEY]!,
    MessageBody: JSON.stringify({ batchId }),
    DelaySeconds: 5 * 60, // 5 minutes
  }));

  for (let i = 0; i < count; i++) {
    const batch: Item[] = Array.from({ length: batchSize }, () => generateTestMessage(batchId));
    await client.send(new SendMessageCommand({
      QueueUrl: process.env[PROCESSING_QUEUE_URL_KEY]!,
      MessageBody: JSON.stringify(batch),
    }));
    for (const item of batch) {
      await ddbClient.send(new PutCommand({
        TableName: process.env[TABLE_NAME_KEY]!,
        Item: {
          pk: item.batchId,
          sk: item.itemId,
          value: item.value,
          status: 'queued',
        },
      }));
    }
  }
  return {
    batchId,
  };
};

function generateTestMessage(batchId: string): Item {
  const newId = uuidv4();
  return {
    itemId: newId,
    batchId: batchId,
    value: Math.floor(Math.random() * 1_000),
  };
}
