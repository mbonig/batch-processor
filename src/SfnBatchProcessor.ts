import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { SfnBatcher } from './BatchProcessor/SfnBatcher';
import { SfnProcessor } from './BatchProcessor/SfnProcessor/SfnProcessor';

export class SfnBatchProcessor extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);
    const processingTime = Duration.minutes(5);
    const batcher = new SfnBatcher(this, 'Batcher');
    new SfnProcessor(this, 'Processor', {
      processingTime,
      batcher: batcher.handler,
      bucket: batcher.bucket,
    });
  }
}
