import { sourceDynamo } from './source-dynamo';
import { scanTable } from './utils/dynamo';
import type { AWSConfig } from './utils/types';

const dynamoTableName = 'table-name';

vi.mock('./utils/dynamo');

const awsConfig: AWSConfig = {
  accessKeyId: 'access-key-id',
  region: 'region',
  secretAccessKey: 'secret-access-key',
  sessionToken: 'session-token',
};

const scanTableMock = vi.mocked(scanTable);

const data = [
  { _pk: 'pk1', _sk: 'sk1', value: 1 },
  { _pk: 'pk2', _sk: 'sk2', value: 2 },
  { _pk: 'pk3', _sk: 'sk3', value: 3 },
];

describe('source-dynamo', () => {
  beforeEach(() => {
    scanTableMock.mockReset();
  });

  it('should flow', async () => {
    scanTableMock.mockResolvedValue(data);
    const result = await sourceDynamo(awsConfig, { dynamoTableName });

    expect(scanTableMock).toHaveBeenCalledExactlyOnceWith(expect.any(Object), dynamoTableName);
    expect(result).toStrictEqual(result);
  });

  it('should fail', async () => {
    scanTableMock.mockRejectedValue(new Error('error-message-source-dynamo'));

    await expect(sourceDynamo(awsConfig, { dynamoTableName })).rejects.toThrow('error-message-source-dynamo');
  });
});
