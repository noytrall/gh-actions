import { readFileSync } from 'node:fs';
import runner from './runner.js';
import { targetDynamo } from '../../target-dynamo.js';
import { targetS3 } from '../../target-s3.js';
import { getInput, setFailed } from '@actions/core';
import type { Config } from '../../utils/types.js';

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

describe('target', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    process.env.GITHUB_WORKSPACE = '/workspace';
    process.env.AWS_REGION = 'eu-west-1';
    process.env.AWS_ACCESS_KEY_ID = 'key';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret';
    process.env.AWS_SESSION_TOKEN = 'token';
  });

  it('should flow with target="dynamo"', async () => {
    coreGetInputMock.mockImplementation((name: string) => {
      if (name === 'config-path') return 'config.json';
      if (name === 'source-data') return JSON.stringify({ data: [{ id: 1 }] });
      if (name === 'transformed-data') return '';
      throw new Error('unexpected input ' + name);
    });

    const config: Config = {
      source: { type: 'dynamo', dynamoTableName: 'source-table' },
      target: { type: 'dynamo', dynamoTableName: 'target-table', purgeTable: false },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));
    await runner();

    expect(targetDynamoMock).toHaveBeenCalledTimes(1);
    expect(targetS3Mock).not.toHaveBeenCalled();
    expect(setFailed).not.toHaveBeenCalled();
  });

  it('should flow with target="s3"', async () => {
    coreGetInputMock.mockImplementation((name: string) => {
      if (name === 'config-path') return 'config.json';
      if (name === 'source-data') return JSON.stringify({ data: [{ id: 1 }] });
      if (name === 'transformed-data') return '[{}]';
      throw new Error('unexpected input ' + name);
    });

    const config: Config = {
      source: { type: 'dynamo', dynamoTableName: 'source-table' },
      target: { type: 's3', s3Config: { Bucket: 'bucket', Key: 'key' } },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));
    await runner();

    expect(targetDynamoMock).not.toHaveBeenCalled();
    expect(targetS3Mock).toHaveBeenCalledTimes(1);
    expect(setFailed).not.toHaveBeenCalled();
  });

  it('should throw an error when config is invalid', async () => {
    coreGetInputMock.mockImplementation((name: string) => {
      if (name === 'config-path') return 'config.json';
      if (name === 'source-data') return JSON.stringify({ data: [{ id: 1 }] });
      if (name === 'transformed-data') return '[{}]';
      throw new Error('unexpected input ' + name);
    });

    const config = {
      source: { type: 'dynamo' },
      target: { type: 's3', s3Config: { Bucket: 'bucket', Key: 'key' } },
    };
    readFileSyncMock.mockReturnValue(JSON.stringify(config));
    await runner();

    expect(targetDynamoMock).not.toHaveBeenCalled();
    expect(targetS3Mock).not.toHaveBeenCalled();
    expect(setFailed).toHaveBeenCalled();
  });
});
