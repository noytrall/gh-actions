import type { AWSConfig, SourceData, SourceType, TargetDynamoParameters } from "./utils/types.js";
export default function (sourceData: SourceData, sourceType: SourceType, { accessKeyId, region, secretAccessKey, sessionToken }: AWSConfig, { dynamoTableName, purgeTable, tablePrimaryKey, }: Omit<TargetDynamoParameters, "type">): Promise<void>;
