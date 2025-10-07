import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
export declare const scanTable: (client: DynamoDBDocumentClient, tableName: string) => Promise<Record<string, unknown>[]>;
export declare function mapDynamoItemsToPkSk(data: Array<Record<string, unknown>>, pk: string, sk?: string): {
    [pk]: unknown;
    [sk]: unknown;
}[];
