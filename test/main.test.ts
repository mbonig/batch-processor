import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { BatchProcessor } from '../src/PipelineStack';

test('Snapshot', () => {
  const app = new App();
  const stack = new BatchProcessor(app, 'test');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
