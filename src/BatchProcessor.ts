import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Batcher } from './BatchProcessor/Batcher';
import { Finalizer } from './BatchProcessor/Finalizer';
import { Processor } from './BatchProcessor/Processor';

export class BatchProcessor extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);
    const processingTime = Duration.minutes(5);
    const processor = new Processor(this, 'Processor', { processingTime });

    new Batcher(this, 'Batcher', {
      pollingQueue: processor.pollingQueue,
      processingQueue: processor.processingQueue,
      table: processor.table,
    });
    new Finalizer(this, 'Finalizer', { queue: processor.pollingQueue, table: processor.table });
  }
}
