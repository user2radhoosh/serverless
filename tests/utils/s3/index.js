'use strict';

const AWS = require('aws-sdk');
const { region, logger, persistentRequest } = require('../misc');

function createAndRemoveInBucket(bucketName) {
  const S3 = new AWS.S3({ region });

  const params = {
    Bucket: bucketName,
    Key: 'object',
    Body: 'hello world',
  };

  return S3.putObject(params).promise()
    .then(() => {
      delete params.Body;
      return S3.deleteObject(params);
    });
}

function emptyBucket(bucket) {
  const S3 = new AWS.S3({ region });

  return S3.listObjects({ Bucket: bucket })
    .promise()
    .then(data => {
      const items = data.Contents;
      const numItems = items.length;
      logger.log(`Bucket ${bucket} has ${numItems} items`);
      if (numItems) {
        const keys = items.map(item => Object.assign({}, { Key: item.Key }));
        return S3.deleteObjects({
          Bucket: bucket,
          Delete: {
            Objects: keys,
          },
        }).promise();
      }
      return null;
    });
}

function deleteBucket(bucket) {
  const S3 = new AWS.S3({ region });

  return emptyBucket(bucket).then(() => {
    logger.log(`Bucket ${bucket} is now empty, deleting...`);
    return S3.deleteBucket({ Bucket: bucket }).promise();
  });
}

module.exports = {
  createAndRemoveInBucket: persistentRequest.bind(this, createAndRemoveInBucket),
  emptyBucket: persistentRequest.bind(this, emptyBucket),
  deleteBucket: persistentRequest.bind(this, deleteBucket),
};
