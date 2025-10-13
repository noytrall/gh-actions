import { getInput, setFailed } from '@actions/core';
import { readFileSync } from 'node:fs';
import { sourceDynamo } from '../../source-dynamo';
import { sourceS3 } from '../../source-s3';
import type { Config } from '../../utils/types';
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

describe('source', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    process.env.GITHUB_WORKSPACE = '/workspace';
    process.env.AWS_REGION = 'eu-west-1';
    process.env.AWS_ACCESS_KEY_ID = 'key';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret';
    process.env.AWS_SESSION_TOKEN = 'token';

    coreGetInputMock.mockImplementation((name: string) => {
      if (name === 'config-path') return 'config.json';
      throw new Error('unexpected input ' + name);
    });
  });

  it('should flow with source="dynamo"', async () => {
    sourceDynamoMock.mockResolvedValue([]);

    const config: Config = {
      source: { type: 'dynamo', dynamoTableName: 'source-table' },
      target: { type: 'dynamo', dynamoTableName: 'target-table', purgeTable: false },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));
    await runner();

    expect(sourceDynamoMock).toHaveBeenCalledTimes(1);
    expect(sourceS3Mock).not.toHaveBeenCalled();
    expect(setFailed).not.toHaveBeenCalled();
  });

  it('should flow with source="s3"', async () => {
    const output = {
      Body: {
        transformToByteArray: async () => Promise.resolve(new Uint8Array([])),
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
    expect(sourceS3Mock).toHaveBeenCalledTimes(1);
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
    expect(sourceS3Mock).toHaveBeenCalledTimes(1);
    expect(setFailed).toHaveBeenCalledExactlyOnceWith('No Body attribute in response');
  });

  it('should fail with source="dynamo" and invalid data returned from sourceDynamo', async () => {
    const config: Config = {
      source: { type: 'dynamo', dynamoTableName: 'source-table' },
      target: { type: 'dynamo', dynamoTableName: 'target-table', purgeTable: false },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));
    await runner();

    expect(sourceDynamoMock).toHaveBeenCalledTimes(1);
    expect(sourceS3Mock).not.toHaveBeenCalled();
    expect(setFailed).toHaveBeenCalledExactlyOnceWith('Somehow, sourceData is null');
  });

  it('should fail when config is invalid', async () => {
    readFileSyncMock.mockReturnValue(JSON.stringify({}));
    await runner();

    expect(sourceDynamoMock).not.toHaveBeenCalled();
    expect(sourceS3Mock).not.toHaveBeenCalled();
    expect(setFailed).toHaveBeenCalled();
  });
});
