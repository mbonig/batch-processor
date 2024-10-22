import { Duration } from 'aws-cdk-lib';
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IQueue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { POLLING_QUEUE_URL_KEY, PROCESSING_QUEUE_URL_KEY, TABLE_NAME_KEY } from './SqsBatcher.Resource';

interface BatcherProps {
  readonly table: ITableV2;
  readonly processingQueue: IQueue;
  readonly pollingQueue: IQueue;
}

export class SqsBatcher extends Construct {
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

    props.table.grantWriteData(handler);
    props.processingQueue.grantSendMessages(handler);
    props.pollingQueue.grantSendMessages(handler);
  }

}
