import { Duration } from 'aws-cdk-lib';
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { IQueue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { BUCKET_NAME_KEY } from './Batcher.DistributedBatcher';
import { POLLING_QUEUE_URL_KEY, PROCESSING_QUEUE_URL_KEY, TABLE_NAME_KEY } from './Batcher.Resource';

interface BatcherProps {
  readonly table: ITableV2;
  readonly processingQueue: IQueue;
  readonly pollingQueue: IQueue;
}

export class Batcher extends Construct {
  constructor(scope: Construct, id: string, props: BatcherProps) {
    super(scope, id);

    const handler = new NodejsFunction(this, 'Resource', {
      environment: {
        [POLLING_QUEUE_URL_KEY]: props.pollingQueue.queueUrl,
        [PROCESSING_QUEUE_URL_KEY]: props.processingQueue.queueUrl,
        [TABLE_NAME_KEY]: props.table.tableName,
      },
      timeout: Duration.minutes(15),
      runtime: Runtime.NODEJS_20_X,
    });

    const bucket = new Bucket(this, 'Bucket', {});
    // this should probably be pulled out into it's own stack
    const distributedBatcher = new NodejsFunction(this, 'DistributedBatcher', {
      environment: {
        [BUCKET_NAME_KEY]: bucket.bucketName,
      },
      timeout: Duration.minutes(5),
      memorySize: 5096,
    });
    bucket.grantReadWrite(distributedBatcher);
    props.table.grantWriteData(handler);
    props.processingQueue.grantSendMessages(handler);
    props.pollingQueue.grantSendMessages(handler);
  }

}
