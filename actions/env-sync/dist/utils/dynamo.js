import { DynamoDBDocumentClient, ScanCommand, } from "@aws-sdk/lib-dynamodb";
import { resultFail, resultSuccess } from "./result.js";
export const scanTable = async (client, tableName) => {
    try {
        let exclusiveLastKey = undefined;
        const data = [];
        do {
            const input = {
                TableName: tableName,
                ExclusiveStartKey: exclusiveLastKey,
            };
            const scanCommand = new ScanCommand(input);
            const result = await client.send(scanCommand);
            if (!result.Items)
                return resultFail(500, "Something has gone terribly wrong");
            data.push(...result.Items);
            exclusiveLastKey = result.LastEvaluatedKey;
            console.log(result.LastEvaluatedKey);
        } while (exclusiveLastKey);
        return resultSuccess(data);
    }
    catch (err) {
        return resultFail("500", err);
    }
};
export function mapDynamoItemsToPkSk(data, pk, sk) {
    const fn = sk
        ? (item) => ({ [pk]: item[pk], [sk]: item[sk] })
        : (item) => ({ [pk]: item[pk] });
    return data.map(fn);
}
//# sourceMappingURL=dynamo.js.map