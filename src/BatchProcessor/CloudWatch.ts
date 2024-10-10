import { CloudWatchClient, PutMetricDataCommand, PutMetricDataCommandInput } from '@aws-sdk/client-cloudwatch';


// Create a CloudWatch client
const client = new CloudWatchClient({});

export const writeMetric = (metricName: string, value: number) => {
  // Define your custom metric data
  const metricData: PutMetricDataCommandInput = {
    MetricData: [
      {
        MetricName: metricName, // Name of the metric
        Dimensions: [
          {
            Name: 'Items', // Dimension name
            Value: 'Count', // Dimension value
          },
        ],
        Unit: 'Count', // Unit of the metric
        Value: value, // Metric value
      },
    ],
    Namespace: 'MTB.BatchProcessor', // Namespace of the metric
  };

  // Create the command
  // Send the command to CloudWatch
  return client.send(new PutMetricDataCommand(metricData));
};
