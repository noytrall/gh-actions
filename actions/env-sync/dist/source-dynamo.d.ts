import type { BaseDynamoParameters } from "./utils/type.js";
export default function ({ accessKeyId, region, secretAccessKey, sessionToken, dynamoTableName, }: Omit<BaseDynamoParameters, "type">): Promise<Record<string, unknown>[]>;
