import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Item } from '../Item';
import { TABLE_NAME_KEY } from '../Processor.Resource';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const REMAINING_FIELD_NAME = 'remaining';
export const FINISHED_PROCESSING_STATE = 'finished';

export class ItemAlreadyProcessingError implements Error {
  message: string;
  name: string;
  existingItem: Item;

  constructor(item: Item, existingItem: Item, message?: string) {
    this.name = item.itemId;
    this.message = message ?? 'The item is already being processed.';
    this.existingItem = existingItem;
  }
}

export async function writeProcessingState(item: Item) {
  try {
    await client.send(new PutCommand({
      TableName: process.env[TABLE_NAME_KEY]!,
      ReturnValuesOnConditionCheckFailure: 'ALL_OLD', // return back the value so we can evaluate state and decide if reprocessing is needed or not
      Item: {
        pk: item.batchId,
        sk: item.itemId,
        status: 'processing',
      },
      ConditionExpression: '#status <> :status', // don't need attribute_not_exists(pk)
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'processing',
      },
    }));
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      console.info('ConditionCheckFailed: ', err);
      throw new ItemAlreadyProcessingError(item, err.Item);
    } else {
      console.error('Error inserting item:', err);
      throw err;
    }
  }
}

export async function writeFailedState(item: Item, err: Error) {
  await client.send(new PutCommand({
    TableName: process.env[TABLE_NAME_KEY]!,
    Item: {
      pk: item.batchId,
      sk: item.itemId,
      status: 'failed',
      failedReason: err.message,
    },
  }));

}

export async function writeFinishedState(item: Item) {

  // need for idempotency of 1+ queue delivery
  await client.send(new PutCommand({
    TableName: process.env[TABLE_NAME_KEY]!,
    Item: {
      pk: item.batchId,
      sk: item.itemId,
      status: FINISHED_PROCESSING_STATE,
      ttl: Math.floor(Date.now() / 1000) + 60,
    },
  }));

  // push this to a stream processor
  return client.send(new UpdateCommand({
    TableName: process.env[TABLE_NAME_KEY]!,
    ReturnValues: 'UPDATED_NEW',
    Key: {
      pk: item.batchId,
      sk: 'status',
    },
    UpdateExpression: 'SET #remaining = if_not_exists(#remaining, :base) + :increment',
    ExpressionAttributeNames: {
      '#remaining': REMAINING_FIELD_NAME,
    },
    ExpressionAttributeValues: {
      ':increment': -1,
      ':base': 0,
    },
  }));
}
