# Batch Processing in Lambda

This repository is an example of how you can handle batch processing in AWS Lambda. The example is a simple one, but it can be easily extended to more complex scenarios.

Specifically, this tries to answer the question of how to know when a batch of items has been processed. This is a common problem when you have a large number of items to process and you want to know when all of them have been processed. 

There is a blog [here](https://matthewbonig.com/posts/batching/) and a video [here](https://www.youtube.com/watch?v=JSKiEjio7Ds) that goes with this repo.

# Spec

A set large and variable set of items need to be processed. The items are processed using AWS Lambda Functions to process each item. We need to know when all the items have been processed.

# SQS Solution

AWS Lambda Functions will be used to process each time. Additionally, a number of other AWS services will be used to manage the batch processing. This includes SQS, DynamoDB, and EventBridge. 
This can be found in the SqsBatchProcessing stack.

# Step Functions Solution

This follows Yan's approach and uses Step Functions to manage the batch processing. 
This can be found in the SfnBatchProcessing stack.

# Considerations

In order from most to least important:

1. Cost - The solution should have a low total cost of ownership. This includes runtime costs of Lambda Functions and other AWS services, as well as the cost of development and maintenance.
2. Simplicity - The solution should be easy to understand and maintain. This includes the code, the architecture, and the deployment process.
3. Scalability - The solution should work well regardless if it's 100 items or 100 million items.

# SQS Architecture

Let's start with some basic definitions:

* 'Item' - a collection of information that needs further processing. In the case of this example the item consists of a unique identifier, 'id', and a random integer between 0 and 1000, the 'value'. This 'value' will be used later to simulate data processing by becoming the amount of time a Lambda Function will sleep.
* 'Batcher' - a Lambda Functions which creates all the items to be processed.
* 'Processor' - a Lambda Function which processes one of many items.
* 'Batch State' - a DynamoDB table which will keep track of each item and its processing state, as well as the state of the batch as a whole.
* 'Finalizer' - a Lambda Function which determines if all items have been processed and sends a notification to that effect.

The architecture is as follows:

1. An EventBridge rule with cron schedule (4x a day) triggers the batcher.
2. The batcher creates a set number of items to be processed. Each item will have a unique ID and a random 'value' between 0 and 1000. It will write messages to an SQS queue. Each message may contain more than one item to be processed. This will act as a tuning parameter to minimize runtime and costs during optimization routines. It also writes itemState records to DynamoDB.
3. The SQS queue is an event source on the processor. The processor will iterate over all items in the message and process each one individually. The processor then removes the itemState record from the DynamoDB table.
4. The finalizer runs a query against the DynamoDB table for the given batch to see if there are any records left. 
5. If there are no records left, the batch is considered complete.

