import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Batcher } from './BatchProcessor/Batcher';
import { Finalizer } from './BatchProcessor/Finalizer';
import { Ingestion } from './BatchProcessor/Ingestion';
import { Processor } from './BatchProcessor/Processor';

export class BatchProcessor extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);
    const processingTime = Duration.minutes(5);
    const ingestion = new Ingestion(this, 'Ingestion', { processingTime });
    const processor = new Processor(this, 'Processor', { queue: ingestion.queue, processingTime });
    new Batcher(this, 'Batcher', { queue: ingestion.queue, table: processor.table });
    new Finalizer(this, 'Finalizer', { table: processor.table });
  }
}
