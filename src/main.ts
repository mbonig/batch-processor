import { App } from 'aws-cdk-lib';
import { BatchProcessor } from './BatchProcessor';

const app = new App();

new BatchProcessor(app, 'batch-processor', {
  env: {
    account: '071128183726',
    region: 'us-east-1',
  },
});

app.synth();
