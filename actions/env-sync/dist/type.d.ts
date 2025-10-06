import z from "zod";
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
        purgeTable: z.ZodBoolean;
        tablePK: z.ZodOptional<z.ZodString>;
        tableSK: z.ZodOptional<z.ZodString>;
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
