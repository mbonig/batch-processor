import { StepFunctionsAutoDiscover } from '@matthewbonig/state-machine';
import { awscdk } from 'projen';

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.159.1',
  defaultReleaseBranch: 'main',
  name: 'batch-processor',
  projenrcTs: true,
  deps: [
    '@aws-sdk/client-cloudwatch',
    '@aws-sdk/client-sqs',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-s3',
    '@aws-sdk/lib-dynamodb',
    '@aws-sdk/util-dynamodb',
    '@matthewbonig/state-machine',
    '@types/aws-lambda',
    '@types/uuid',
    'cdk-iam-floyd',
    'uuid',
  ],
});

// @ts-ignore
new StepFunctionsAutoDiscover(project, {});

project.synth();
