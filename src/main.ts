import { App } from 'aws-cdk-lib';
import { SfnBatchProcessor } from './SfnBatchProcessor';
import { SqsBatchProcessor } from './SqsBatchProcessor';

const app = new App();

new SqsBatchProcessor(app, 'sqs-batch-processor', {
  env: {
    account: '071128183726',
    region: 'us-east-1',
  },
});

new SfnBatchProcessor(app, 'sfn-batch-processor', {
  env: {
    account: '071128183726',
    region: 'us-east-1',
  },
});

app.synth();
