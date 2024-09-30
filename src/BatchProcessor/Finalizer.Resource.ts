import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SQSEvent } from 'aws-lambda';

const sqsClient = new SQSClient({});
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const TABLE_NAME_KEY = 'TABLE_NAME';
export const QUEUE_URL_KEY = 'QUEUE_URL';

export const handler = async (event: SQSEvent) => {
  console.log('event', JSON.stringify(event, null, 2));

  for (const record of event.Records) {

    const message: { batchId: string } = JSON.parse(record.body);
    // read the table, limit to just one record
    const item = await ddbClient.send(new QueryCommand({
      TableName: process.env[TABLE_NAME_KEY]!,
      Limit: 1,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': message.batchId,
      },
    }));

    if (item.Count === 0) {
      // if no records exist, the batch is complete
      console.info('The batch is complete!');
      // do something with the batch
    } else {
      // if one record exists, the batch is not complete
      console.info('The batch is not complete, waiting 5 minutes and then will check again');

      // put another message on the queue having it checked again in 5 minutes
      await sqsClient.send(new SendMessageCommand({
        QueueUrl: process.env[QUEUE_URL_KEY]!,
        MessageBody: record.body,
        DelaySeconds: 5 * 60, // 5 minutes
      }));
    }
  }
};
