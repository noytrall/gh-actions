import { DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, type DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoData, DynamoTablePrimaryKey } from './types';
import { doPurgeTable, getTablePrimaryKey, populateTable, scanTable } from './dynamo';

const tableName = 'table-name';

const mockSend = vi.fn();

const client = { send: mockSend } as unknown as DynamoDBDocumentClient;

describe('dynamo utils', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });
  describe('scanTable', () => {
    it('should flow', async () => {
      mockSend
        .mockResolvedValueOnce({
          Items: [
            { _pk: '1', _sk: '1' },
            { _pk: '2', _sk: '2' },
          ],
          LastEvaluatedKey: { _pk: '', _sk: '' },
        })
        .mockResolvedValue({ Items: [{ _pk: '3', _sk: '3' }], LastEvaluatedKey: undefined });

      const result = await scanTable(client, tableName);

      expect(mockSend).toHaveBeenCalledTimes(2);

      const firstCallArg = mockSend.mock.calls[0]![0];
      const secondCallArg = mockSend.mock.calls[1]![0];

      expect(firstCallArg).toBeInstanceOf(ScanCommand);
      expect(secondCallArg).toBeInstanceOf(ScanCommand);

      expect(firstCallArg.input).toMatchObject({
        TableName: tableName,
        ExclusiveStartKey: undefined,
      });

      expect(secondCallArg.input).toMatchObject({
        TableName: tableName,
        ExclusiveStartKey: { _pk: '', _sk: '' },
      });
      expect(result).toStrictEqual([
        { _pk: '1', _sk: '1' },
        { _pk: '2', _sk: '2' },
        { _pk: '3', _sk: '3' },
      ]);
    });

    it('should throw an error when the Items attribute is undefined', async () => {
      mockSend.mockResolvedValue({});

      await expect(scanTable(client, tableName)).rejects.toThrow('Something has gone terribly wrong');
    });

    it('should throw an error when table scan fails', async () => {
      mockSend.mockRejectedValue(new Error('scan error'));

      await expect(scanTable(client, tableName)).rejects.toThrow('scan error');
    });
  });

  describe('getTablePrimaryKey', () => {
    it('should flow', async () => {
      mockSend.mockResolvedValue({
        Table: {
          KeySchema: [
            { KeyType: 'HASH', AttributeName: '_pk' },
            { KeyType: 'RANGE', AttributeName: '_sk' },
          ],
        },
      });

      const result = await getTablePrimaryKey(client, tableName);

      expect(mockSend).toHaveBeenCalledTimes(1);

      const firstCallArg = mockSend.mock.calls[0]![0];

      expect(firstCallArg).toBeInstanceOf(DescribeTableCommand);

      expect(firstCallArg.input).toMatchObject({
        TableName: tableName,
      });

      expect(result).toStrictEqual({ pk: '_pk', sk: '_sk' });
    });
    it('should return early when tablePrimaryKey parameter is provided', async () => {
      const result = await getTablePrimaryKey(client, tableName, { pk: 'PK', sk: 'SK' });
      expect(result).toStrictEqual({ pk: 'PK', sk: 'SK' });
    });

    it('should fail then Table attribute is not found in describeTableCommand result', async () => {
      mockSend.mockResolvedValue({});

      await expect(getTablePrimaryKey(client, tableName)).rejects.toThrow('Table attribute not defined');
    });

    it('should fail when no hash Key is found', async () => {
      mockSend.mockResolvedValue({
        Table: {
          KeySchema: [{ KeyType: 'RANGE', AttributeName: '_sk' }],
        },
      });

      await expect(getTablePrimaryKey(client, tableName)).rejects.toThrow('No PK found for table ' + tableName);
    });
  });

  describe('doPurgeTable', () => {
    const tablePrimaryKey: DynamoTablePrimaryKey = { pk: '_pk' };

    it('should not need to delete any items', async () => {
      const newData: DynamoData = [{ _pk: 1 }, { _pk: 2 }];
      const oldData: DynamoData = [{ _pk: 1 }, { _pk: 2 }];
      mockSend.mockResolvedValueOnce({
        Items: oldData,
        LastEvaluatedKey: undefined,
      });

      const result = await doPurgeTable(client, tableName, tablePrimaryKey, newData);

      expect(mockSend).toHaveBeenCalledTimes(1);

      expect(result).toBeUndefined();
    });

    it.each([
      {
        tablePrimaryKey: { pk: '_pk' },
        newData: [{ _pk: 1 }, { _pk: 3 }],
        oldData: [{ _pk: 1 }, { _pk: 2 }],
        toDelete: [{ _pk: 2 }],
      },
      {
        tablePrimaryKey: { pk: '_pk', sk: '_sk' },
        newData: [
          { _pk: 1, _sk: 'sk-1' },
          { _pk: 3, _sk: 'sk-3' },
        ],
        oldData: [
          { _pk: 1, _sk: 'sk-1' },
          { _pk: 2, _sk: 'sk-2' },
        ],
        toDelete: [{ _pk: 2, _sk: 'sk-2' }],
      },
    ])('should delete some items', async ({ newData, oldData, tablePrimaryKey, toDelete }) => {
      mockSend
        .mockResolvedValueOnce({
          Items: oldData,
          LastEvaluatedKey: undefined,
        })
        .mockResolvedValue({});

      const result = await doPurgeTable(client, tableName, tablePrimaryKey, newData);

      expect(mockSend).toHaveBeenCalledTimes(2);

      const firstCallArg = mockSend.mock.calls[1]![0];

      expect(firstCallArg).toBeInstanceOf(BatchWriteCommand);

      expect(firstCallArg.input).toMatchObject({
        RequestItems: {
          [tableName]: toDelete.map((Key) => ({ DeleteRequest: { Key } })),
        },
      });
      expect(result).toBeUndefined();
    });

    it('should throw error when delete request fails', async () => {
      const newData: DynamoData = [{ _pk: 1 }, { _pk: 3 }];
      const oldData: DynamoData = [{ _pk: 1 }, { _pk: 2 }];
      mockSend
        .mockResolvedValueOnce({
          Items: oldData,
          LastEvaluatedKey: undefined,
        })
        .mockRejectedValue(new Error('delete request error message'));

      await expect(doPurgeTable(client, tableName, tablePrimaryKey, newData)).rejects.toThrow(
        'delete request error message',
      );
    });

    it('should flow with complex primary key', async () => {
      const newData: DynamoData = [
        { _pk: 1, _sk: 'sk-1' },
        { _pk: 2, _sk: 'sk-2' },
      ];
      const oldData: DynamoData = [
        { _pk: 1, _sk: 'sk-1' },
        { _pk: 2, _sk: 'sk-2' },
      ];
      mockSend.mockResolvedValueOnce({
        Items: oldData,
        LastEvaluatedKey: undefined,
      });

      const result = await doPurgeTable(client, tableName, { pk: '_pk', sk: '_sk' }, newData);

      expect(mockSend).toHaveBeenCalledTimes(1);

      expect(result).toBeUndefined();
    });
  });

  describe('populateTable', () => {
    it('should flow', async () => {
      mockSend.mockResolvedValue({});
      const result = await populateTable(client, tableName, [{ _pk: 11 }]);

      expect(mockSend).toHaveBeenCalledTimes(1);

      const firstCallArg = mockSend.mock.calls[0]![0];

      expect(firstCallArg).toBeInstanceOf(BatchWriteCommand);

      expect(firstCallArg.input).toMatchObject({
        RequestItems: {
          [tableName]: [{ PutRequest: { Item: { _pk: 11 } } }],
        },
      });
      expect(result).toBeUndefined();
    });

    it('should throw error when put request fails', async () => {
      mockSend.mockRejectedValue(new Error('put request error message'));

      await expect(populateTable(client, tableName, [{ _pk: 123 }])).rejects.toThrow('put request error message');
    });
  });
});
