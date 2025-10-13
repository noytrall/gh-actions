import { GetObjectCommand } from '@aws-sdk/client-s3';
import sourceS3 from './source-s3';
import type { AWSConfig } from './utils/types';

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

const Bucket = 'bucket';
const Key = 'key';
const Body = { a: 1 };

describe('source-s3', () => {
  mockSend.mockResolvedValueOnce({
    Body,
  });

  it('should flow', async () => {
    const result = await sourceS3(awsConfig, { Bucket, Key });

    expect(mockSend).toHaveBeenCalledTimes(1);

    const firstCallArg = mockSend.mock.calls[0]![0];

    expect(firstCallArg).toBeInstanceOf(GetObjectCommand);
    expect(firstCallArg.input).toMatchObject({
      Bucket,
      Key,
    });

    expect(result).toMatchObject({ Body });
  });

  it('should throw an error when getObjectCommand fails', async () => {
    mockSend.mockRejectedValue(new Error('get object error'));

    await expect(sourceS3(awsConfig, { Bucket, Key })).rejects.toThrow('get object error');
  });
});
