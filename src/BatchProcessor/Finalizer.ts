import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { RecursiveLoop } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IQueue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { QUEUE_URL_KEY, TABLE_NAME_KEY } from './Finalizer.Resource';

interface FinalizerProps {
  table: ITableV2;
  queue: IQueue;
}

/**
 * The Finalizer monitors a DynamoDB table for completion of processing.
 */
export class Finalizer extends Construct {
  constructor(scope: Construct, id: string, props: FinalizerProps) {
    super(scope, id);

    const handler = new NodejsFunction(this, 'Resource', {
      environment: {
        [TABLE_NAME_KEY]: props.table.tableName,
        [QUEUE_URL_KEY]: props.queue.queueUrl,
      },
      recursiveLoop: RecursiveLoop.ALLOW,
    });
    props.table.grantReadData(handler);
    props.queue.grantSendMessages(handler);
    handler.addEventSource(new SqsEventSource(props.queue, {}));
  }

}
