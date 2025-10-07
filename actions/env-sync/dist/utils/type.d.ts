import z from "zod";
declare const dynamoTablePrimaryKeySchema: z.ZodObject<{
    pk: z.ZodString;
    sk: z.ZodOptional<z.ZodString>;
}, z.z.core.$strip>;
export type DynamoTablePrimaryKey = z.infer<typeof dynamoTablePrimaryKeySchema>;
declare const targetDynamoParametersSchema: z.ZodObject<{
    region: z.ZodString;
    accessKeyId: z.ZodString;
    secretAccessKey: z.ZodString;
    sessionToken: z.ZodString;
    type: z.ZodLiteral<"dynamo">;
    dynamoTableName: z.ZodString;
    purgeTable: z.ZodOptional<z.ZodBoolean>;
    tablePrimaryKey: z.ZodOptional<z.ZodObject<{
        pk: z.ZodString;
        sk: z.ZodOptional<z.ZodString>;
    }, z.z.core.$strip>>;
}, z.z.core.$strip>;
export type TargetDynamoParameters = z.infer<typeof targetDynamoParametersSchema>;
export declare const configSchema: z.ZodObject<{
    source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        region: z.ZodString;
        accessKeyId: z.ZodString;
        secretAccessKey: z.ZodString;
        sessionToken: z.ZodString;
        type: z.ZodLiteral<"dynamo">;
        dynamoTableName: z.ZodString;
    }, z.z.core.$strip>, z.ZodObject<{
        region: z.ZodString;
        accessKeyId: z.ZodString;
        secretAccessKey: z.ZodString;
        sessionToken: z.ZodString;
        type: z.ZodLiteral<"s3">;
        s3BucketName: z.ZodString;
        s3Key: z.ZodString;
    }, z.z.core.$strip>], "type">;
    target: z.ZodDiscriminatedUnion<[z.ZodObject<{
        region: z.ZodString;
        accessKeyId: z.ZodString;
        secretAccessKey: z.ZodString;
        sessionToken: z.ZodString;
        type: z.ZodLiteral<"dynamo">;
        dynamoTableName: z.ZodString;
        purgeTable: z.ZodOptional<z.ZodBoolean>;
        tablePrimaryKey: z.ZodOptional<z.ZodObject<{
            pk: z.ZodString;
            sk: z.ZodOptional<z.ZodString>;
        }, z.z.core.$strip>>;
    }, z.z.core.$strip>, z.ZodObject<{
        region: z.ZodString;
        accessKeyId: z.ZodString;
        secretAccessKey: z.ZodString;
        sessionToken: z.ZodString;
        type: z.ZodLiteral<"s3">;
        s3BucketName: z.ZodString;
        s3Key: z.ZodString;
    }, z.z.core.$strip>], "type">;
}, z.z.core.$strip>;
export type Config = z.infer<typeof configSchema>;
export type DynamoData = Array<Record<string, unknown>>;
export {};
