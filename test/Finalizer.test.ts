import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AttributeType, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Finalizer } from '../src/BatchProcessor/Finalizer';

describe('Finalizer', () => {
  function createTestStack() {
    const stack = new Stack();
    new Finalizer(stack, 'Finalizer', {
      table: new TableV2(stack, 'Table', {
        partitionKey: {
          name: 'pk',
          type: AttributeType.STRING,
        },
      }),
    });
    return stack;
  }

  describe('Pipes', () => {

    it('Role is correct', () => {
      const stack = createTestStack();

      const assert = Template.fromStack(stack);
      assert.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: {
              Service: 'pipes.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
            Condition: {
              StringEquals: {
                'aws:SourceArn': {
                  'Fn::Sub': 'arn:${AWS::Partition}:pipes:${AWS::Region}:${AWS::AccountId}:pipe/publish-batch-complete',
                },
                'aws:SourceAccount': {
                  'Fn::Sub': '${AWS::AccountId}',
                },
              },
            },
          }],
        },
      });
    }) ;

    it('Role Permissions are correct', () => {
      const stack = createTestStack();

      const assert = Template.fromStack(stack);
      assert.hasResourceProperties('AWS::IAM::RolePolicy', {
        RoleName: {
          Ref: 'Role6db625e9',
        },
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Action: ['events:PutEvents'],
            Resource: [{
              'Fn::Sub': 'arn:${AWS::Partition}:events:${AWS::Region}:${AWS::AccountId}:event-bus/default',
            }],
          }],
        },
      });
    });
    it('Pipe is correct', () => {
      const stack = createTestStack();

      const assert = Template.fromStack(stack);
      assert.hasResourceProperties('AWS::Pipes::Pipe', {
        RoleArn: {
          'Fn::GetAtt': ['Role6db625e9', 'Arn'],
        },
        Name: 'publish-batch-complete',
        DesiredState: 'RUNNING',
        Source: {
          'Fn::Sub': 'arn:${AWS::Partition}:dynamodb:${AWS::Region}:${AWS::AccountId}:table/batch-processor-ProcessorStateTable55BAFD12-1CD0URDMOHHML/stream/2024-08-02T19:48:35.568',
        },
        SourceParameters: {
          FilterCriteria: {
            Filters: [{
              Pattern: '{"dynamodb":{"NewImage":{"remaining":{"N":["0"]}}}}',
            }],
          },
          DynamoDBStreamParameters: {
            BatchSize: 1,
            MaximumRecordAgeInSeconds: -1,
            MaximumRetryAttempts: -1,
            StartingPosition: 'LATEST',
          },
        },
        LogConfiguration: {
          CloudwatchLogsLogDestination: {
            LogGroupArn: {
              'Fn::Sub': 'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/vendedlogs/pipes/publish-batch-complete',
            },
          },
          Level: 'ERROR',
        },
        TargetParameters: {
          EventBridgeEventBusParameters: {
            DetailType: 'batch-completed',
            Source: 'MTB.BatchProcessor',
          },
        },
        Target: {
          'Fn::Sub': 'arn:${AWS::Partition}:events:${AWS::Region}:${AWS::AccountId}:event-bus/default',
        },

      });
    });

  });
});
