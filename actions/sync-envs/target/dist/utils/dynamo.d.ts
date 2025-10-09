import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { DynamoData } from "./type.js";
export declare const scanTable: (client: DynamoDBDocumentClient, tableName: string, attributes?: string[]) => Promise<DynamoData>;
export declare function mapDynamoItemsToPkSk(data: Array<Record<string, unknown>>, pk: string, sk?: string): {
    [pk]: unknown;
    [sk]: unknown;
}[];
