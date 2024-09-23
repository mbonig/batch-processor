import { awscdk } from 'projen';
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.149.0',
  defaultReleaseBranch: 'main',
  name: 'batch-processor',
  projenrcTs: true,
  deps: [
    '@aws-sdk/client-cloudwatch',
    '@aws-sdk/client-sqs',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
    '@aws-sdk/util-dynamodb',
    '@types/aws-lambda',
    '@types/uuid',
    'cdk-iam-floyd',
    'uuid',
  ],
});
project.synth();
