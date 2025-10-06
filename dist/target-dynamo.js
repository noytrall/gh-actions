"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const result_1 = require("./utils/result");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamo_1 = require("./utils/dynamo");
const nodash_1 = require("./utils/nodash");
async function default_1({ accessKeyId, region, secretAccessKey, tableName, sessionToken, purgeTable, tablePK, tableSK, data, }) {
    try {
        const dynamodbClient = new client_dynamodb_1.DynamoDBClient({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
                sessionToken,
            },
        });
        const client = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamodbClient, {
            marshallOptions: { removeUndefinedValues: true },
        });
        // TODO: only delete items that do not exist in data (PutRequest will overwrite these, no need to delete)
        if (purgeTable && tablePK) {
            const scanResult = await (0, dynamo_1.scanTable)(client, tableName);
            if (!scanResult.success)
                return scanResult;
            const batches = (0, nodash_1.chunk)(scanResult.value, 25);
            for (const [index, batch] of batches.entries()) {
                try {
                    const command = new lib_dynamodb_1.BatchWriteCommand({
                        RequestItems: {
                            [tableName]: batch.map((item) => ({
                                DeleteRequest: {
                                    Key: {
                                        [tablePK]: item[tablePK],
                                        ...(tableSK ? { [tableSK]: item[tableSK] } : {}),
                                    },
                                },
                            })),
                        },
                    });
                    // TODO: handle UnprocessedItems
                    await client.send(command);
                }
                catch (err) {
                    console.log(`Failed purge of target table at ${index}/${batches.length}: ${(0, dynamo_1.mapDynamoItemsToPkSk)(batch, tablePK, tableSK).join(", ")}`);
                    return (0, result_1.resultFail)(500, err);
                }
            }
        }
        const batches = (0, nodash_1.chunk)(data, 25);
        for (const [index, batch] of batches.entries()) {
            try {
                const command = new lib_dynamodb_1.BatchWriteCommand({
                    RequestItems: {
                        [tableName]: batch.map((item) => ({
                            PutRequest: {
                                Item: item,
                            },
                        })),
                    },
                });
                // TODO: handle UnprocessedItems
                await client.send(command);
            }
            catch (err) {
                console.log(`Failed purge of target table at ${index}/${batches.length}: ${(tablePK
                    ? (0, dynamo_1.mapDynamoItemsToPkSk)(batch, tablePK, tableSK)
                    : batch).join(", ")}`);
            }
        }
        return (0, result_1.resultSuccess)(null);
    }
    catch (err) {
        return (0, result_1.resultFail)("500", err);
    }
}
