import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, ITableV2, StreamViewType, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IQueue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

interface ProcessorProps {
  processingTime: Duration;
  queue: IQueue;
}

export class Processor extends Construct {
  public table: ITableV2;
  constructor(scope: Construct, id: string, props: ProcessorProps) {
    super(scope, id);

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
      },
      runtime: Runtime.NODEJS_20_X,
      timeout: props.processingTime,
    });
    this.table.grantReadWriteData(handler);
    handler.addToRolePolicy(new PolicyStatement({
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
      effect: Effect.ALLOW,
    }));

    handler.addEventSource(new SqsEventSource(props.queue, {
      reportBatchItemFailures: true,
    }));
  }

}
