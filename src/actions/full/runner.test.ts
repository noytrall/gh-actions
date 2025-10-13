import { getInput, setFailed } from '@actions/core';
import { readFileSync } from 'node:fs';
import { sourceDynamo } from '../../source-dynamo';
import { sourceS3 } from '../../source-s3';
import { targetDynamo } from '../../target-dynamo';
import { targetS3 } from '../../target-s3';
import type { AWSConfig, Config } from '../../utils/types';
import runner from './runner';
import type { GetObjectCommandOutput } from '@aws-sdk/client-s3';

vi.mock('@actions/core');
vi.mock('node:fs');
vi.mock('node:path', () => ({
  default: {
    resolve: (...args: string[]) => args.join('/'),
  },
}));
vi.mock('../../target-dynamo.js');
vi.mock('../../target-s3.js');
vi.mock('../../source-dynamo.js');
vi.mock('../../source-s3.js');
vi.mock('../../utils/errors.js', () => ({
  getErrorMessage: vi.fn((err) => err.message ?? String(err)),
}));
const readFileSyncMock = vi.mocked(readFileSync);
const targetDynamoMock = vi.mocked(targetDynamo);
const targetS3Mock = vi.mocked(targetS3);
const sourceDynamoMock = vi.mocked(sourceDynamo);
const sourceS3Mock = vi.mocked(sourceS3);
const coreGetInputMock = vi.mocked(getInput);

describe('full', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    coreGetInputMock.mockImplementation((name: string) => {
      if (name === 'config-path') return 'config.json';
      if (name === 'source-aws-region') return 'source-aws-region';
      if (name === 'source-aws-access-key-id') return 'source-aws-access-key-id';
      if (name === 'source-aws-secret-access-key') return 'source-aws-secret-access-key';
      if (name === 'source-aws-session-token') return 'source-aws-session-token';
      if (name === 'target-aws-region') return 'target-aws-region';
      if (name === 'target-aws-access-key-id') return 'target-aws-access-key-id';
      if (name === 'target-aws-secret-access-key') return 'target-aws-secret-access-key';
      if (name === 'target-aws-session-token') return 'target-aws-session-token';

      throw new Error('unexpected input ' + name);
    });
  });

  const sourceAwsConfig: AWSConfig = {
    accessKeyId: 'source-aws-access-key-id',
    region: 'source-aws-region',
    secretAccessKey: 'source-aws-secret-access-key',
    sessionToken: 'source-aws-session-token',
  };
  const targetAwsConfig: AWSConfig = {
    accessKeyId: 'target-aws-access-key-id',
    region: 'target-aws-region',
    secretAccessKey: 'target-aws-secret-access-key',
    sessionToken: 'target-aws-session-token',
  };

  it('should flow; source=dynamo & target=dynamo', async () => {
    const sourceData = [{ _pk: '1' }];

    const sourceTableName = 'source-table';
    const targetTableName = 'target-table';
    const config: Config = {
      source: { type: 'dynamo', dynamoTableName: sourceTableName },
      target: { type: 'dynamo', dynamoTableName: targetTableName, purgeTable: true },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));
    sourceDynamoMock.mockResolvedValueOnce(sourceData);

    await runner();

    expect(sourceDynamoMock).toHaveBeenCalledExactlyOnceWith(sourceAwsConfig, { dynamoTableName: sourceTableName });
    expect(sourceS3Mock).not.toHaveBeenCalled();
    expect(targetDynamoMock).toHaveBeenCalledExactlyOnceWith(sourceData, targetAwsConfig, {
      dynamoTableName: targetTableName,
      purgeTable: true,
      tablePrimaryKey: undefined,
    });
    expect(targetS3Mock).not.toHaveBeenCalled();
    expect(setFailed).not.toHaveBeenCalled();
  });

  it('should flow; source=dynamo & target=s3', async () => {
    const sourceData = [{ _pk: '1' }];
    const sourceTableName = 'source-table';
    const s3Config: Extract<Config['target'], { type: 's3' }>['s3Config'] = {
      Bucket: 'target-bucket',
      Key: 'target-key',
    };
    const config: Config = {
      source: { type: 'dynamo', dynamoTableName: sourceTableName },
      target: { type: 's3', s3Config },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));
    sourceDynamoMock.mockResolvedValueOnce(sourceData);

    await runner();

    expect(sourceDynamoMock).toHaveBeenCalledExactlyOnceWith(sourceAwsConfig, { dynamoTableName: sourceTableName });
    expect(sourceS3Mock).not.toHaveBeenCalled();
    expect(targetDynamoMock).not.toHaveBeenCalled();
    expect(targetS3Mock).toHaveBeenCalledExactlyOnceWith(sourceData, targetAwsConfig, {
      ContentType: 'application/json',
      Metadata: undefined,
      ...s3Config,
    });
    expect(setFailed).not.toHaveBeenCalled();
  });

  it('should flow; source=s3 & target=dynamo', async () => {
    const encoder = new TextEncoder();
    const sourceData = encoder.encode(JSON.stringify([{ _pk: '1' }]));

    const s3Config: Extract<Config['target'], { type: 's3' }>['s3Config'] = {
      Bucket: 'source-bucket',
      Key: 'source-key',
    };
    const targetTableName = 'target-table';
    const config: Config = {
      source: { type: 's3', s3Config },
      target: { type: 'dynamo', dynamoTableName: targetTableName, purgeTable: true },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));

    const output = {
      Body: {
        transformToByteArray: async () => Promise.resolve(sourceData),
      },
    } as GetObjectCommandOutput;
    sourceS3Mock.mockResolvedValue(output);

    await runner();

    expect(sourceDynamoMock).not.toHaveBeenCalled();
    expect(sourceS3Mock).toHaveBeenCalledExactlyOnceWith(sourceAwsConfig, s3Config);
    expect(targetDynamoMock).toHaveBeenCalledExactlyOnceWith(sourceData, targetAwsConfig, {
      dynamoTableName: targetTableName,
      purgeTable: true,
      tablePrimaryKey: undefined,
    });
    expect(targetS3Mock).not.toHaveBeenCalled();
    expect(setFailed).not.toHaveBeenCalled();
  });

  it('should flow; source=s3 & target=s3', async () => {
    const encoder = new TextEncoder();
    const sourceData = encoder.encode(JSON.stringify([{ _pk: '1' }]));

    const sourceS3Config: Extract<Config['target'], { type: 's3' }>['s3Config'] = {
      Bucket: 'source-bucket',
      Key: 'source-key',
    };
    const targetS3Config: Extract<Config['target'], { type: 's3' }>['s3Config'] = {
      Bucket: 'target-bucket',
      Key: 'target-key',
    };
    const config: Config = {
      source: { type: 's3', s3Config: sourceS3Config },
      target: { type: 's3', s3Config: targetS3Config },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));

    const output = {
      Body: {
        transformToByteArray: async () => Promise.resolve(sourceData),
      },
    } as GetObjectCommandOutput;
    sourceS3Mock.mockResolvedValue(output);

    await runner();

    expect(sourceDynamoMock).not.toHaveBeenCalled();
    expect(sourceS3Mock).toHaveBeenCalledExactlyOnceWith(sourceAwsConfig, sourceS3Config);
    expect(targetDynamoMock).not.toHaveBeenCalled();
    expect(targetS3Mock).toHaveBeenCalledExactlyOnceWith(sourceData, targetAwsConfig, { ...targetS3Config });
    expect(setFailed).not.toHaveBeenCalled();
  });

  it('should fail when config is invalid', async () => {
    const config = {};
    readFileSyncMock.mockReturnValue(JSON.stringify(config));

    await runner();

    expect(sourceDynamoMock).not.toHaveBeenCalled();
    expect(sourceS3Mock).not.toHaveBeenCalled();
    expect(targetDynamoMock).not.toHaveBeenCalled();
    expect(targetS3Mock).not.toHaveBeenCalled();
    expect(setFailed).toHaveBeenCalled();
  });

  it('should fail when response.Body is undefined from sourceS3; source=s3', async () => {
    const sourceS3Config: Extract<Config['target'], { type: 's3' }>['s3Config'] = {
      Bucket: 'source-bucket',
      Key: 'source-key',
    };

    const config: Config = {
      source: { type: 's3', s3Config: sourceS3Config },
      target: { type: 'dynamo', dynamoTableName: 'table' },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));
    sourceS3Mock.mockResolvedValue({ Body: undefined, $metadata: {} });

    await runner();

    expect(sourceDynamoMock).not.toHaveBeenCalled();
    expect(sourceS3Mock).toHaveBeenCalledExactlyOnceWith(sourceAwsConfig, sourceS3Config);
    expect(targetDynamoMock).not.toHaveBeenCalled();
    expect(targetS3Mock).not.toHaveBeenCalled();
    expect(setFailed).toHaveBeenCalledExactlyOnceWith('No Body attribute in response');
  });

  it('should fail when source data is invalid; source=dynamo', async () => {
    const sourceTableName = 'source-table';
    const s3Config: Extract<Config['target'], { type: 's3' }>['s3Config'] = {
      Bucket: 'target-bucket',
      Key: 'target-key',
    };
    const config: Config = {
      source: { type: 'dynamo', dynamoTableName: sourceTableName },
      target: { type: 's3', s3Config },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));

    await runner();

    expect(sourceDynamoMock).toHaveBeenCalledExactlyOnceWith(sourceAwsConfig, { dynamoTableName: sourceTableName });
    expect(sourceS3Mock).not.toHaveBeenCalled();
    expect(targetDynamoMock).not.toHaveBeenCalled();
    expect(targetS3Mock).not.toHaveBeenCalled();
    expect(setFailed).toHaveBeenCalledExactlyOnceWith('Somehow, sourceData is null');
  });
});
