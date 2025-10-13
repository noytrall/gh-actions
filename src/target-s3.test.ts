import { PutObjectCommand } from '@aws-sdk/client-s3';
import targetS3 from './target-s3';
import type { AWSConfig, SourceData } from './utils/types';

const mockSend = vi.fn();
vi.mock('@aws-sdk/client-s3', async () => ({
  ...(await vi.importActual('@aws-sdk/client-s3')),
  S3Client: vi.fn(() => ({
    send: mockSend,
  })),
}));

const awsConfig: AWSConfig = {
  accessKeyId: 'access-key-id',
  region: 'region',
  secretAccessKey: 'secret-access-key',
  sessionToken: 'session-token',
};

const sourceData: SourceData = [{ attr: 1 }];

const encoder = new TextEncoder();

const Bucket = 'bucket';
const Key = 'key';
const Body = encoder.encode(JSON.stringify(sourceData));

describe('target-s3', () => {
  it('should flow', async () => {
    await targetS3(sourceData, awsConfig, { Bucket, Key, Body });

    expect(mockSend).toHaveBeenCalledTimes(1);

    const firstCallArg = mockSend.mock.calls[0]![0];

    expect(firstCallArg).toBeInstanceOf(PutObjectCommand);
    expect(firstCallArg.input).toMatchObject({
      Bucket,
      Key,
      Body,
    });
  });

  it('should throw an error when source data is invalid', async () => {
    await expect(targetS3(null, awsConfig, { Bucket, Key, Body })).rejects.toThrow(
      'Data type is invalid and cannot be used in PutObjectCommand',
    );
  });

  it('should throw an error when putObjectCommand fails', async () => {
    mockSend.mockRejectedValue(new Error('put object error'));

    await expect(targetS3(sourceData, awsConfig, { Bucket, Key, Body })).rejects.toThrow('put object error');
  });
});
