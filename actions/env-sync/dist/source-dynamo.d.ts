export default function ({ accessKeyId, region, secretAccessKey, sessionToken, tableName, }: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    tableName: string;
}): Promise<Record<string, unknown>[]>;
