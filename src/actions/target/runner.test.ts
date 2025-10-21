import { readFileSync } from 'node:fs';
import runner from './runner.js';
import { targetDynamo } from '../../target-dynamo.js';
import { targetS3 } from '../../target-s3.js';
import { getInput, setFailed } from '@actions/core';
import type { AWSConfig, Config } from '../../utils/types.js';
import { S3_INFO_FILE_PATH, SOURCE_DATA_FILE_PATH } from '../../utils/files.js';

vi.mock('@actions/core');
vi.mock('node:fs');
vi.mock('node:path', () => ({
  default: {
    resolve: (...args: string[]) => args.join('/'),
  },
}));
vi.mock('../../target-dynamo.js');
vi.mock('../../target-s3.js');
vi.mock('../../utils/errors.js', () => ({
  getErrorMessage: vi.fn((err) => err.message ?? String(err)),
}));

const readFileSyncMock = vi.mocked(readFileSync);
const targetDynamoMock = vi.mocked(targetDynamo);
const targetS3Mock = vi.mocked(targetS3);
const coreGetInputMock = vi.mocked(getInput);

process.env.GITHUB_WORKSPACE = '/workspace';
process.env.AWS_REGION = 'eu-west-1';
process.env.AWS_ACCESS_KEY_ID = 'key';
process.env.AWS_SECRET_ACCESS_KEY = 'secret';
process.env.AWS_SESSION_TOKEN = 'token';

const targetAwsConfig: AWSConfig = {
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
};

const sourceData: Record<string, unknown>[] = [];

describe('target', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should flow with target="dynamo"', async () => {
    coreGetInputMock.mockImplementation((name: string) => {
      if (name === 'config-path') return 'config.json';
      throw new Error('unexpected input ' + name);
    });

    const config: Config = {
      source: { type: 'dynamo', dynamoTableName: 'source-table' },
      target: { type: 'dynamo', dynamoTableName: 'target-table', purgeTable: false },
    };
    readFileSyncMock.mockReturnValueOnce(JSON.stringify(config));
    readFileSyncMock.mockReturnValueOnce(JSON.stringify(sourceData));
    await runner();

    expect(readFileSync).toHaveBeenNthCalledWith(1, expect.stringContaining('config.json'), 'utf8');
    expect(readFileSync).toHaveBeenNthCalledWith(2, expect.stringContaining(SOURCE_DATA_FILE_PATH), 'utf8');
    expect(targetDynamoMock).toHaveBeenCalledExactlyOnceWith(sourceData, targetAwsConfig, {
      dynamoTableName: 'target-table',
      purgeTable: false,
      tablePrimaryKey: undefined,
    });
    expect(targetS3Mock).not.toHaveBeenCalled();
    expect(setFailed).not.toHaveBeenCalled();
  });

  it('should flow with target="s3"', async () => {
    const s3Info = { Metadata: undefined, ContentType: undefined };
    coreGetInputMock.mockImplementation((name: string) => {
      if (name === 'config-path') return 'config.json';
      throw new Error('unexpected input ' + name);
    });

    const config: Config = {
      source: { type: 'dynamo', dynamoTableName: 'source-table' },
      target: { type: 's3', s3Config: { Bucket: 'bucket', Key: 'key' } },
    };
    readFileSyncMock.mockReturnValueOnce(JSON.stringify(config));
    readFileSyncMock.mockReturnValueOnce(JSON.stringify(sourceData));
    readFileSyncMock.mockReturnValueOnce(JSON.stringify(s3Info));
    await runner();

    expect(readFileSync).toHaveBeenNthCalledWith(1, expect.stringContaining('config.json'), 'utf8');
    expect(readFileSync).toHaveBeenNthCalledWith(2, expect.stringContaining(SOURCE_DATA_FILE_PATH), 'utf8');

    expect(targetDynamoMock).not.toHaveBeenCalled();
    expect(targetS3Mock).toHaveBeenCalledExactlyOnceWith(sourceData, targetAwsConfig, {
      Metadata: undefined,
      ContentType: 'application/json',
      Bucket: 'bucket',
      Key: 'key',
    });
    expect(setFailed).not.toHaveBeenCalled();
  });

  it("should read s3 info file when target and source are 's3'", async () => {
    const s3Info = { Metadata: undefined, ContentType: undefined };
    coreGetInputMock.mockImplementation((name: string) => {
      if (name === 'config-path') return 'config.json';
      throw new Error('unexpected input ' + name);
    });

    const config: Config = {
      source: { type: 's3', s3Config: { Bucket: 'bucket', Key: 'key' } },
      target: { type: 's3', s3Config: { Bucket: 'bucket', Key: 'key' } },
    };
    readFileSyncMock.mockReturnValueOnce(JSON.stringify(config));
    readFileSyncMock.mockReturnValueOnce(JSON.stringify(sourceData));
    readFileSyncMock.mockReturnValueOnce(JSON.stringify(s3Info));
    await runner();

    expect(readFileSync).toHaveBeenNthCalledWith(3, expect.stringContaining(S3_INFO_FILE_PATH), 'utf8');
  });

  it('should throw an error when config is invalid', async () => {
    coreGetInputMock.mockImplementation((name: string) => {
      if (name === 'config-path') return 'config.json';
      if (name === 'source-data-input-path') return 'source-data-input.json';
      if (name === 's3-info') return '';
      throw new Error('unexpected input ' + name);
    });

    const config = {
      source: { type: 'dynamo' },
      target: { type: 's3', s3Config: { Bucket: 'bucket', Key: 'key' } },
    };
    readFileSyncMock.mockReturnValueOnce(JSON.stringify(config));
    await runner();

    expect(targetDynamoMock).not.toHaveBeenCalled();
    expect(targetS3Mock).not.toHaveBeenCalled();
    expect(setFailed).toHaveBeenCalled();
  });
});
