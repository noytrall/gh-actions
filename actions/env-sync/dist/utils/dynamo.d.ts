import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
export declare const scanTable: (client: DynamoDBDocumentClient, tableName: string) => Promise<import("./result.js").ResultFailure<500> | import("./result.js").ResultSuccess<Record<string, unknown>[]> | import("./result.js").ResultFailure<"500">>;
export declare function mapDynamoItemsToPkSk(data: Array<Record<string, unknown>>, pk: string, sk?: string): {
    [pk]: unknown;
    [sk]: unknown;
}[];
