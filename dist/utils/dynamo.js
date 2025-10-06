"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanTable = scanTable;
exports.mapDynamoItemsToPkSk = mapDynamoItemsToPkSk;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const result_1 = require("./result");
async function scanTable(client, tableName) {
    try {
        let exclusiveLastKey = undefined;
        const data = [];
        do {
            const input = {
                TableName: tableName,
                ExclusiveStartKey: exclusiveLastKey,
            };
            const scanCommand = new lib_dynamodb_1.ScanCommand(input);
            const result = await client.send(scanCommand);
            if (!result.Items)
                return (0, result_1.resultFail)(500, "Something has gone terribly wrong");
            data.push(...result.Items);
            exclusiveLastKey = result.LastEvaluatedKey;
            console.log(result.LastEvaluatedKey);
        } while (exclusiveLastKey);
        return (0, result_1.resultSuccess)(data);
    }
    catch (err) {
        return (0, result_1.resultFail)("500", err);
    }
}
function mapDynamoItemsToPkSk(data, pk, sk) {
    const fn = sk
        ? (item) => ({ [pk]: item[pk], [sk]: item[sk] })
        : (item) => ({ [pk]: item[pk] });
    return data.map(fn);
}
