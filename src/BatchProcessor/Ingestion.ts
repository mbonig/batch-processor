import { Duration } from 'aws-cdk-lib';
import { IQueue, Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface IngestionProps {
  processingTime: Duration;
}

export class Ingestion extends Construct {
  public queue: IQueue;

  constructor(scope: Construct, id: string, props: IngestionProps) {
    super(scope, id);

    // fifo queues to control parallelism? groupids, the lambda poller will scale according to this
    this.queue = new Queue(this, 'Resource', {
      encryption: QueueEncryption.KMS_MANAGED,
      enforceSSL: true,
      visibilityTimeout: props.processingTime,
      deadLetterQueue: {
        queue: new Queue(this, 'DeadLetterQueue'),
        maxReceiveCount: 3,
      },
    });
  }

}
