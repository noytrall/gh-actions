import type { AWSConfig, BaseDynamoParameters } from "./utils/types.js";
export default function ({ accessKeyId, region, secretAccessKey, sessionToken }: AWSConfig, { dynamoTableName }: Omit<BaseDynamoParameters, "type">): Promise<import("./utils/types.js").DynamoData>;
