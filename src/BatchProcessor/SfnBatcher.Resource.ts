import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { Item } from './Item';

const client = new S3Client({});
export const BUCKET_NAME_KEY = 'BUCKET_NAME';
export const handler = async (event: any) => {

  console.log('event', JSON.stringify(event, null, 2));
  const batchSize = +event.batchSize || 10;
  const batchId = `batch-${uuidv4()}`;

  const items = [];

  // create the batch, this is mostly a simulation
  for (let i = 0; i < batchSize; i++) {
    const item = generateTestMessage(batchId);
    items.push(item);
  }

  let key = `${batchId}.json`;
  await client.send(new PutObjectCommand({
    Key: key,
    Bucket: process.env[BUCKET_NAME_KEY]!,
    Body: JSON.stringify(items),
  }));

  return {
    batchId,
    bucket: process.env[BUCKET_NAME_KEY]!,
    object: key,
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
