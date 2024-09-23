import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, ITableV2, StreamViewType, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IQueue, Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

interface ProcessorProps {
  processingTime: Duration;
}

export class Processor extends Construct {
  public table: ITableV2;
  public queue: IQueue;

  constructor(scope: Construct, id: string, props: ProcessorProps) {
    super(scope, id);

    this.queue = new Queue(this, 'CheckForFinished', {
      encryption: QueueEncryption.KMS_MANAGED,
      enforceSSL: true,
      visibilityTimeout: props.processingTime,
      deliveryDelay: Duration.minutes(5), // setting this here, but could and will set it on the message too
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
        TABLE_NAME: this.table.tableName,
        QUEUE_URL: this.queue.queueUrl,
      },
      runtime: Runtime.NODEJS_20_X,
      timeout: props.processingTime,
    });

    this.table.grantReadWriteData(handler);
    this.queue.grantSendMessages(handler);

    handler.addToRolePolicy(new PolicyStatement({
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
      effect: Effect.ALLOW,
    }));

    handler.addEventSource(new DynamoEventSource(this.table, {
      startingPosition: StartingPosition.LATEST,
      reportBatchItemFailures: true,
    }));
  }

}
