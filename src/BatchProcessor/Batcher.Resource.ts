import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { BatchWriteCommand, DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Item } from './Item';

const client = new SQSClient({});
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const TABLE_NAME_KEY = 'TABLE_NAME';
export const QUEUE_URL_KEY = 'QUEUE_URL';

export const handler = async (event: any) => {

  console.log('event', JSON.stringify(event, null, 2));
  const batchSize = +event.batchSize || 10;
  const batchId = `batch-${uuidv4()}`;

  // send a message on the queue to check if the batch is complete.
  await client.send(new SendMessageCommand({
    QueueUrl: process.env[QUEUE_URL_KEY]!,
    MessageBody: JSON.stringify({ batchId }),
    DelaySeconds: 1 * 60, // 5 minutes
  }));

  // create the batch, this is mostly a simulation
  for (let i = 0; i < batchSize; i++) {
    const item = generateTestMessage(batchId);
    /*await ddbClient.send(new BatchWriteCommand({
      RequestItems:
    }));*/
    await ddbClient.send(new PutCommand({
      TableName: process.env[TABLE_NAME_KEY]!,
      Item: {
        pk: item.batchId,
        sk: item.itemId,
        value: item.value,
      },
    }));
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
