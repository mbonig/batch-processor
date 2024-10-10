import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, ITableV2, StreamViewType, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IQueue, Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { POLLING_QUEUE_URL_KEY, PROCESSING_QUEUE_URL_KEY, TABLE_NAME_KEY } from './SqsProcessor.Resource';

interface ProcessorProps {
  processingTime: Duration;
}

export class SqsProcessor extends Construct {
  public table: ITableV2;
  public pollingQueue: IQueue;
  processingQueue: IQueue;

  constructor(scope: Construct, id: string, props: ProcessorProps) {
    super(scope, id);

    this.pollingQueue = new Queue(this, 'CheckForFinished', {
      encryption: QueueEncryption.KMS_MANAGED,
      enforceSSL: true,
      visibilityTimeout: props.processingTime,
    });

    this.processingQueue = new Queue(this, 'ProcessingQueue', {
      encryption: QueueEncryption.KMS_MANAGED,
      enforceSSL: true,
      visibilityTimeout: props.processingTime,
    });

    this.table = new TableV2(this, 'StateTable', {
      partitionKey: {
        name: 'pk',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: AttributeType.STRING,
      },
      timeToLiveAttribute: 'ttl',
      dynamoStream: StreamViewType.NEW_IMAGE,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const handler = new NodejsFunction(this, 'Resource', {
      environment: {
        [TABLE_NAME_KEY]: this.table.tableName,
        [POLLING_QUEUE_URL_KEY]: this.pollingQueue.queueUrl,
        [PROCESSING_QUEUE_URL_KEY]: this.processingQueue.queueUrl,
      },
      runtime: Runtime.NODEJS_20_X,
      timeout: props.processingTime,
    });

    this.table.grantReadWriteData(handler);
    this.pollingQueue.grantSendMessages(handler);
    this.processingQueue.grantSendMessages(handler);

    handler.addToRolePolicy(new PolicyStatement({
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
      effect: Effect.ALLOW,
    }));

    handler.addEventSource(new SqsEventSource(this.processingQueue, {
      reportBatchItemFailures: true,
      batchSize: 10,
    }));

  }

}
