import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Batch, Item } from './Item';

const client = new SQSClient({});
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const TABLE_NAME_KEY = 'TABLE_NAME';
export const QUEUE_URL_KEY = 'QUEUE_URL';

export const handler = async (event: any) => {

  console.log('event', JSON.stringify(event, null, 2));
  const count = +event.count || 1;
  const batchSize = +event.batchSize || 10;
  const batchId = `batch-${uuidv4()}`;
  for (let i = 0; i < count; i++) {

    const batch: Batch = Array.from({ length: batchSize }, () => generateTestMessage(batchId));
    await client.send(new SendMessageCommand({
      QueueUrl: process.env[QUEUE_URL_KEY]!,
      MessageBody: JSON.stringify(batch),
    }));
  }

  await ddbClient.send(new PutCommand({
    TableName: process.env[TABLE_NAME_KEY]!,
    Item: {
      pk: batchId,
      sk: 'status',
      remaining: batchSize * count,
    },
  }));

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
