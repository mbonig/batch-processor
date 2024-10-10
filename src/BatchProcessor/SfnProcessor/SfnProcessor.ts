import { Arn, ArnFormat, Duration, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BatchProcessorStateMachine } from './batch-processor-statemachine';

interface SfnProcessorProps {
  bucket: IBucket;
  batcher: IFunction;
  processingTime: Duration;
}

export class SfnProcessor extends Construct {
  handler: IFunction;

  constructor(scope: Construct, id: string, props: SfnProcessorProps) {
    super(scope, id);
    const processor = this.handler = new NodejsFunction(this, 'Resource', {
      runtime: Runtime.NODEJS_20_X,
      timeout: props.processingTime,
    });

    this.handler.addToRolePolicy(new PolicyStatement({
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
      effect: Effect.ALLOW,
    }));

    const workflow = new BatchProcessorStateMachine(this, 'BatchProcessorStateMachine', {
      overrides: {
        'Create Batch': {
          Parameters: {
            FunctionName: props.batcher.functionName,
          },
        },
        'Map': {
          ItemProcessor: {
            States: {
              'Process Item': {
                Parameters: {
                  FunctionName: processor.functionName,
                },
              },
            },
          },
        },
      },
    });
    workflow.addToRolePolicy(new PolicyStatement({
      actions: ['states:StartExecution'],
      resources: [
        Arn.format({
          service: 'states',
          resource: 'stateMachine',
          resourceName: 'ProcessorBatchProcessorStateMachine*',
          arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        }, Stack.of(this)),
      ],
      effect: Effect.ALLOW,
    }));

    props.batcher.grantInvoke(workflow);
    processor.grantInvoke(workflow);
    props.bucket.grantRead(workflow);

  }
}
