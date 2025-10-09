import type { AWSConfig, BaseDynamoParameters } from "./utils/type.js";
export default function ({ accessKeyId, region, secretAccessKey, sessionToken }: AWSConfig, { dynamoTableName }: Omit<BaseDynamoParameters, "type">): Promise<import("./utils/type.js").DynamoData>;
