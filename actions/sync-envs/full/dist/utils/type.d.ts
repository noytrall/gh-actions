import type { GetObjectCommandInput, PutObjectCommandInput } from "@aws-sdk/client-s3";
import z from "zod";
declare const baseDynamoParametersSchema: z.ZodObject<{
    type: z.ZodLiteral<"dynamo">;
    dynamoTableName: z.ZodString;
}, z.z.core.$strip>;
export type BaseDynamoParameters = z.infer<typeof baseDynamoParametersSchema>;
declare const sourceS3ParametersSchema: z.ZodObject<{
    type: z.ZodLiteral<"s3">;
    s3Config: z.ZodObject<{
        Bucket: z.ZodString;
        Key: z.ZodString;
    }, z.z.core.$loose>;
}, z.z.core.$strip>;
export type SourceS3Parameters = z.infer<typeof sourceS3ParametersSchema> & {
    s3Config: GetObjectCommandInput;
};
declare const targetS3ParametersSchema: z.ZodObject<{
    type: z.ZodLiteral<"s3">;
    s3Config: z.ZodObject<{
        Bucket: z.ZodString;
        Key: z.ZodString;
    }, z.z.core.$loose>;
}, z.z.core.$strip>;
export type TargetS3Parameters = z.infer<typeof targetS3ParametersSchema> & {
    s3Config: PutObjectCommandInput;
};
declare const dynamoTablePrimaryKeySchema: z.ZodObject<{
    pk: z.ZodString;
    sk: z.ZodOptional<z.ZodString>;
}, z.z.core.$strip>;
export type DynamoTablePrimaryKey = z.infer<typeof dynamoTablePrimaryKeySchema>;
declare const targetDynamoParametersSchema: z.ZodObject<{
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
        type: z.ZodLiteral<"dynamo">;
        dynamoTableName: z.ZodString;
    }, z.z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"s3">;
        s3Config: z.ZodObject<{
            Bucket: z.ZodString;
            Key: z.ZodString;
        }, z.z.core.$loose>;
    }, z.z.core.$strip>], "type">;
    target: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"dynamo">;
        dynamoTableName: z.ZodString;
        purgeTable: z.ZodOptional<z.ZodBoolean>;
        tablePrimaryKey: z.ZodOptional<z.ZodObject<{
            pk: z.ZodString;
            sk: z.ZodOptional<z.ZodString>;
        }, z.z.core.$strip>>;
    }, z.z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"s3">;
        s3Config: z.ZodObject<{
            Bucket: z.ZodString;
            Key: z.ZodString;
        }, z.z.core.$loose>;
    }, z.z.core.$strip>], "type">;
}, z.z.core.$strip>;
export type Config = z.infer<typeof configSchema>;
export type SourceData = Array<Record<string, any>> | Uint8Array | null;
export type DynamoData = Array<Record<string, unknown>>;
export type S3Data = Uint8Array;
export type SourceType = "dynamo" | "s3";
export type TargetType = "dynamo" | "s3";
export type AWSConfig = {
    accessKeyId: string;
    region: string;
    secretAccessKey: string;
    sessionToken: string;
};
export {};
