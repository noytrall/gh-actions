import type { DynamoData, TargetDynamoParameters } from "./utils/type.js";
export default function ({ accessKeyId, region, secretAccessKey, tableName, sessionToken, purgeTable, tablePrimaryKey, data, }: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    tableName: string;
    sessionToken: string;
    purgeTable?: boolean;
    tablePrimaryKey: TargetDynamoParameters["tablePrimaryKey"];
    data: DynamoData;
}): Promise<import("./utils/result.js").ResultFailure<500> | import("./utils/result.js").ResultFailure<"500"> | import("./utils/result.js").ResultSuccess<null>>;
