"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const result_1 = require("./utils/result");
const dynamo_1 = require("./utils/dynamo");
async function default_1({ accessKeyId, region, secretAccessKey, sessionToken, tableName, }) {
    try {
        const dynamodbClient = new client_dynamodb_1.DynamoDBClient({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
                sessionToken: sessionToken,
            },
        });
        const client = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamodbClient, {
            marshallOptions: { removeUndefinedValues: true },
        });
        return await (0, dynamo_1.scanTable)(client, tableName);
    }
    catch (err) {
        return (0, result_1.resultFail)("500", err instanceof Error ? err.message : err);
    }
}
