'use strict';

// NOTE: This script requires Node.js > 8 to run since it uses
// modern Node.js / JavaScript features such as async / await

const { logger, testServiceIdentifier } = require('./misc');
const { findStacks, deleteStack, listStackResources } = require('./cloudformation');
const { findRestApis, deleteRestApi } = require('./api-gateway');
const { deleteBucket } = require('./s3');

async function findDeploymentBuckets(stacks) {
  const buckets = [];
  for (const stack of stacks) {
    const stackResources = await listStackResources(stack.StackId);
    const bucket = stackResources.filter((resource) => {
      return resource.LogicalResourceId === 'ServerlessDeploymentBucket';
    });
    buckets.push(bucket);
  }
  return buckets;
}

async function cleanup() {
  const date = new Date();
  const yesterday = date.setDate(date.getDate() - 1);

  const status = [
    'CREATE_FAILED',
    'CREATE_COMPLETE',
    'ROLLBACK_FAILED',
    'ROLLBACK_COMPLETE',
    'DELETE_FAILED',
    'UPDATE_ROLLBACK_FAILED',
    'UPDATE_ROLLBACK_COMPLETE',
  ];

  // find all the resources
  const stacks = await findStacks(testServiceIdentifier, status);
  const apis = await findRestApis(testServiceIdentifier);

  let bucketsToRemove = [];
  const stacksToRemove = stacks.filter((stack) => +new Date(stack.LastUpdatedTime) < yesterday);
  const apisToRemove = apis.filter((api) => +new Date(api.createdDate) < yesterday);
  if (stacksToRemove) {
    bucketsToRemove = await findDeploymentBuckets(stacksToRemove);
  }

  logger.log(`${bucketsToRemove.length} Buckets to remove...`);
  logger.log(`${stacksToRemove.length} Stacks to remove...`);
  logger.log(`${apisToRemove.length} APIs to remove...`);

  if (bucketsToRemove.length) {
    logger.log('Removing Buckets...');
    const promises = bucketsToRemove
      .map(bucket => deleteBucket(bucket.PhysicalResourceId));
    await Promise.all(promises);
  }

  if (stacksToRemove.length) {
    logger.log('Removing Stacks...');
    const promises = stacksToRemove
      .map(stack => deleteStack(stack.StackName));
    await Promise.all(promises);
  }

  if (apisToRemove.length) {
    logger.log('Removing APIs...');
    const promises = apisToRemove.map(api => deleteRestApi(api.id));
    await Promise.all(promises);
  }
}

cleanup();
