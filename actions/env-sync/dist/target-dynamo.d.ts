export default function ({ accessKeyId, region, secretAccessKey, tableName, sessionToken, purgeTable, tablePK, tableSK, data, }: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    tableName: string;
    sessionToken: string;
    purgeTable?: boolean;
    tablePK?: string;
    tableSK?: string;
    data: Array<Record<string, unknown>>;
}): Promise<import("./utils/result.js").ResultFailure<500> | import("./utils/result.js").ResultFailure<"500"> | import("./utils/result.js").ResultSuccess<null>>;
