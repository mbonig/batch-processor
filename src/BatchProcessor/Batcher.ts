import { Duration } from 'aws-cdk-lib';
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IQueue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { QUEUE_URL_KEY, TABLE_NAME_KEY } from './Batcher.Resource';

interface BatcherProps {
  readonly table: ITableV2;
  readonly queue: IQueue;
}

export class Batcher extends Construct {
  constructor(scope: Construct, id: string, props: BatcherProps) {
    super(scope, id);

    const handler = new NodejsFunction(this, 'Resource', {
      environment: {
        [QUEUE_URL_KEY]: props.queue.queueUrl,
        [TABLE_NAME_KEY]: props.table.tableName,
      },
      timeout: Duration.minutes(15),
      runtime: Runtime.NODEJS_20_X,
    });

    props.table.grantWriteData(handler);
    props.queue.grantSendMessages(handler);
  }

}
