export default function ({ accessKeyId, region, secretAccessKey, sessionToken, tableName, }: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    tableName: string;
}): Promise<import("./utils/result.js").ResultFailure<500> | import("./utils/result.js").ResultSuccess<Record<string, unknown>[]> | import("./utils/result.js").ResultFailure<"500">>;
