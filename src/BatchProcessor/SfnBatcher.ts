import { Duration } from 'aws-cdk-lib';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BUCKET_NAME_KEY } from './SfnBatcher.Resource';

export class SfnBatcher extends Construct {
  handler: IFunction;
  bucket: IBucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    const bucket = this.bucket = new Bucket(this, 'Bucket', {});

    const distributedBatcher = this.handler = new NodejsFunction(this, 'Resource', {
      environment: {
        [BUCKET_NAME_KEY]: bucket.bucketName,
      },
      timeout: Duration.minutes(5),
      memorySize: 5096,
    });
    bucket.grantReadWrite(distributedBatcher);
  }
}
