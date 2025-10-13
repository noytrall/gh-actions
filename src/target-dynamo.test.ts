import targetDynamo from './target-dynamo';
import { doPurgeTable, getTablePrimaryKey, populateTable } from './utils/dynamo';
import type { AWSConfig, SourceData } from './utils/types';

vi.mock('./utils/dynamo');
vi.mock('@aws-sdk/client-dynamodb');
const mockSend = vi.fn();
vi.mock('@aws-sdk/lib-dynamodb', async () => ({
  ...(await vi.importActual('@aws-sdk/lib-dynamodb')),
  DynamoDBDocumentClient: {
    from: () => ({ send: mockSend }),
  },
}));

const getTablePrimaryKeyMocked = vi.mocked(getTablePrimaryKey);

const awsConfig: AWSConfig = {
  accessKeyId: 'access-key-id',
  region: 'region',
  secretAccessKey: 'secret-access-key',
  sessionToken: 'session-token',
};

const dynamoTableName = 'table-name';

describe('target-dynamo', () => {
  const data: SourceData = [{ _pk: '1', _sk: '123' }];
  it('should flow + purge table + getTablePrimaryKey', async () => {
    const primaryKey = { pk: '_pk', sk: '_sk' };
    getTablePrimaryKeyMocked.mockResolvedValueOnce(primaryKey);
    const result = await targetDynamo(data, awsConfig, { dynamoTableName, purgeTable: true });

    expect(getTablePrimaryKey).toHaveBeenCalledExactlyOnceWith(expect.any(Object), dynamoTableName, undefined);
    expect(doPurgeTable).toHaveBeenCalledExactlyOnceWith(expect.any(Object), dynamoTableName, primaryKey, data);

    expect(populateTable).toHaveBeenCalledExactlyOnceWith(expect.any(Object), dynamoTableName, data);

    expect(result).toBeUndefined();
  });

  it('should flow without purging table', async () => {
    const result = await targetDynamo(data, awsConfig, { dynamoTableName, purgeTable: false });

    expect(getTablePrimaryKey).not.toHaveBeenCalled();
    expect(doPurgeTable).not.toHaveBeenCalled();
    expect(populateTable).toHaveBeenCalledExactlyOnceWith(expect.any(Object), dynamoTableName, data);

    expect(result).toBeUndefined();
  });

  it('should flow and transform data when data is Uint8Array', async () => {
    const encoder = new TextEncoder();
    const jsonString = encoder.encode(JSON.stringify(data));

    await targetDynamo(jsonString, awsConfig, { dynamoTableName });

    expect(populateTable).toHaveBeenCalledExactlyOnceWith(
      expect.any(Object),
      dynamoTableName,
      expect.arrayContaining(data),
    );
  });

  it('should flow and transform data when data is Uint8Array stringfied and parsed', async () => {
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(JSON.stringify(data));

    await targetDynamo(JSON.parse(JSON.stringify(uint8Array)), awsConfig, { dynamoTableName });

    expect(populateTable).toHaveBeenCalledExactlyOnceWith(
      expect.any(Object),
      dynamoTableName,
      expect.arrayContaining(data),
    );
  });

  it('should throw an error when data is invalid', async () => {
    await expect(targetDynamo(null, awsConfig, { dynamoTableName })).rejects.toThrow(
      'Data to insert into dynamoDB table is malformed. Requires an array of records',
    );
  });

  it('should throw an error when data is Uint8Array but is not a json parseable', async () => {
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode('a');
    await expect(targetDynamo(uint8Array, awsConfig, { dynamoTableName })).rejects.toThrow(
      expect.objectContaining({ message: expect.stringContaining('Unexpected token') }),
    );
  });
});
