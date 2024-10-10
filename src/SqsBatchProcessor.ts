import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Finalizer } from './BatchProcessor/Finalizer';
import { SqsBatcher } from './BatchProcessor/SqsBatcher';
import { SqsProcessor } from './BatchProcessor/SqsProcessor';

export class SqsBatchProcessor extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);
    const processingTime = Duration.minutes(5);
    const processor = new SqsProcessor(this, 'Processor', { processingTime });

    new SqsBatcher(this, 'Batcher', {
      pollingQueue: processor.pollingQueue,
      processingQueue: processor.processingQueue,
      table: processor.table,
    });
    new Finalizer(this, 'Finalizer', { queue: processor.pollingQueue, table: processor.table });

  }
}
