import { setOutput, setFailed, getInput } from '@actions/core';
import { readFileSync, writeFileSync } from 'node:fs';
import { sourceDynamo } from '../../source-dynamo';
import { sourceS3 } from '../../source-s3';
import type { AWSConfig, Config, SourceData } from '../../utils/types';
import runner from './runner';
import type { GetObjectCommandOutput } from '@aws-sdk/client-s3';

vi.mock('@actions/core');
vi.mock('node:fs');
vi.mock('node:path', () => ({
  default: {
    resolve: (...args: string[]) => args.join('/'),
  },
}));
vi.mock('../../source-dynamo.js');
vi.mock('../../source-s3.js');
vi.mock('../../utils/errors.js', () => ({
  getErrorMessage: vi.fn((err) => err.message ?? String(err)),
}));

const readFileSyncMock = vi.mocked(readFileSync);

const sourceDynamoMock = vi.mocked(sourceDynamo);

const sourceS3Mock = vi.mocked(sourceS3);

const coreGetInputMock = vi.mocked(getInput);

process.env.GITHUB_WORKSPACE = '/workspace';
process.env.AWS_REGION = 'eu-west-1';
process.env.AWS_ACCESS_KEY_ID = 'key';
process.env.AWS_SECRET_ACCESS_KEY = 'secret';
process.env.AWS_SESSION_TOKEN = 'token';

const sourceAwsConfig: AWSConfig = {
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
};

describe('source', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should flow with source="dynamo"', async () => {
    coreGetInputMock.mockImplementation((name: string) => {
      if (name === 'source-data-output-path') return 'source-data.json';
      if (name === 'config-path') return 'config.json';
      throw new Error('unexpected input ' + name);
    });
    const sourceData: SourceData = [];
    sourceDynamoMock.mockResolvedValue(sourceData);

    const config: Config = {
      source: { type: 'dynamo', dynamoTableName: 'source-table' },
      target: { type: 'dynamo', dynamoTableName: 'target-table', purgeTable: false },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));
    await runner();

    expect(sourceDynamoMock).toHaveBeenCalledExactlyOnceWith(sourceAwsConfig, { dynamoTableName: 'source-table' });
    expect(sourceS3Mock).not.toHaveBeenCalled();
    expect(setOutput).not.toHaveBeenCalled();
    expect(writeFileSync).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('source-data.json'),
      JSON.stringify(sourceData),
    );
    expect(setFailed).not.toHaveBeenCalled();
  });

  it('should flow with source="s3"', async () => {
    coreGetInputMock.mockImplementation((name: string) => {
      if (name === 'source-data-output-path') return '';
      if (name === 'config-path') return 'config.json';
      throw new Error('unexpected input ' + name);
    });
    const sourceData: SourceData = new Uint8Array([]);
    const output = {
      Body: {
        transformToByteArray: async () => Promise.resolve(sourceData),
      },
    } as GetObjectCommandOutput;
    sourceS3Mock.mockResolvedValue(output);

    const config: Config = {
      source: { type: 's3', s3Config: { Bucket: 'source-bucket', Key: 'source-key' } },
      target: { type: 's3', s3Config: { Bucket: 'target-bucket', Key: 'target-key' } },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));
    await runner();

    expect(sourceDynamoMock).not.toHaveBeenCalled();
    expect(sourceS3Mock).toHaveBeenCalledExactlyOnceWith(sourceAwsConfig, {
      Bucket: 'source-bucket',
      Key: 'source-key',
    });
    expect(writeFileSync).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('source-data-path'),
      JSON.stringify(sourceData),
    );
    expect(setOutput).toHaveBeenCalledExactlyOnceWith('s3-info', '{}');
    expect(setFailed).not.toHaveBeenCalled();
  });

  it('should fail with source="s3" and response.Body undefined', async () => {
    const output = {
      Body: undefined,
    } as GetObjectCommandOutput;
    sourceS3Mock.mockResolvedValue(output);

    const config: Config = {
      source: { type: 's3', s3Config: { Bucket: 'source-bucket', Key: 'source-key' } },
      target: { type: 's3', s3Config: { Bucket: 'target-bucket', Key: 'target-key' } },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));
    await runner();

    expect(sourceDynamoMock).not.toHaveBeenCalled();
    expect(sourceS3Mock).toHaveBeenCalledExactlyOnceWith(sourceAwsConfig, {
      Bucket: 'source-bucket',
      Key: 'source-key',
    });
    expect(writeFileSync).not.toHaveBeenCalled();
    expect(setFailed).toHaveBeenCalledExactlyOnceWith('No Body attribute in response');
  });

  it('should fail with source="dynamo" and invalid data returned from sourceDynamo', async () => {
    const config: Config = {
      source: { type: 'dynamo', dynamoTableName: 'source-table' },
      target: { type: 'dynamo', dynamoTableName: 'target-table', purgeTable: false },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));
    await runner();

    expect(sourceDynamoMock).toHaveBeenCalledExactlyOnceWith(sourceAwsConfig, { dynamoTableName: 'source-table' });
    expect(sourceS3Mock).not.toHaveBeenCalled();
    expect(writeFileSync).not.toHaveBeenCalled();
    expect(setFailed).toHaveBeenCalledExactlyOnceWith('Somehow, sourceData is null');
  });

  it('should fail when config is invalid', async () => {
    readFileSyncMock.mockReturnValue(JSON.stringify({}));
    await runner();

    expect(sourceDynamoMock).not.toHaveBeenCalled();
    expect(sourceS3Mock).not.toHaveBeenCalled();
    expect(writeFileSync).not.toHaveBeenCalled();
    expect(setFailed).toHaveBeenCalled();
  });
});
