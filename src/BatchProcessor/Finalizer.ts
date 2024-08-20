import { Arn, Aws } from 'aws-cdk-lib';
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { CfnPipe } from 'aws-cdk-lib/aws-pipes';
import { Statement } from 'cdk-iam-floyd';
import { Construct } from 'constructs';

interface FinalizerProps {
  table: ITableV2;
}

/**
 * The Finalizer monitors a DynamoDB table for completion of processing.
 */
export class Finalizer extends Construct {
  constructor(scope: Construct, id: string, props: FinalizerProps) {
    super(scope, id);

    const handler = new NodejsFunction(this, 'Resource', {});

    const pipeName = 'publish-batch-complete';

    const role = new Role(this, 'Role', {
      assumedBy: new ServicePrincipal('pipes.amazonaws.com', {
        conditions: {
          StringEquals: {
            'aws:SourceArn': Arn.format({
              service: 'pipes',
              resource: 'pipe',
              resourceName: pipeName,
              account: Aws.ACCOUNT_ID,
              region: Aws.REGION,
              partition: Aws.PARTITION,
            }),
            'aws:SourceAccount': Aws.ACCOUNT_ID,
          },
        },
      }),
    });

    role.addToPolicy(new Statement.Events().allow().toPutEvents().onEventBus('default'));
    role.addToPolicy(new Statement.Dynamodb().allow()
      .toDescribeStream()
      .toGetRecords()
      .toGetShardIterator()
      .toListStreams()
      .on(props.table.tableStreamArn!),
    );

    const defaultEventBus = EventBus.fromEventBusName(this, 'EventBus', 'default');
    new CfnPipe(this, 'PublishBatchComplete', {
      name: pipeName,
      roleArn: role.roleArn,
      source: props.table.tableStreamArn!,
      sourceParameters: {
        filterCriteria: {
          filters: [
            {
              pattern: '{"dynamodb":{"NewImage":{"remaining":{"N":["0"]}}}}',
            },
          ],
        },
        dynamoDbStreamParameters: {
          batchSize: 1,
          startingPosition: 'LATEST',
        },
      },
      target: defaultEventBus.eventBusArn,
      targetParameters: {
        eventBridgeEventBusParameters: {
          detailType: 'batch-completed',
          source: 'MTB.BatchProcessor',
        },
      },
    });

    new Rule(this, 'Rule', {
      eventBus: defaultEventBus,
      eventPattern: {
        source: ['MTB.BatchProcessor'],
        detailType: ['batch-completed'],
      },
      targets: [new LambdaFunction(handler)],
    });
  }

}
