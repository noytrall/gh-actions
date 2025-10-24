import type { GetObjectCommandInput, PutObjectCommandInput } from '@aws-sdk/client-s3';
import z from 'zod';

const baseDynamoParametersSchema = z.object({
  type: z.literal('dynamo'),
  dynamoTableName: z.string(),
});
export type BaseDynamoParameters = z.infer<typeof baseDynamoParametersSchema>;

const baseS3ParametersSchema = z.object({
  type: z.literal('s3'),
});

const sourceDynamoParametersSchema = baseDynamoParametersSchema.extend({
  maxNumberOfRecords: z.number().optional(),
});
export type SourceDynamoParameters = z.infer<typeof sourceDynamoParametersSchema>;

const sourceS3ParametersSchema = baseS3ParametersSchema.extend({
  s3Config: z.looseObject({
    Bucket: z.string(),
    Key: z.string(),
  }),
});
export type SourceS3Parameters = z.infer<typeof sourceS3ParametersSchema> & {
  s3Config: GetObjectCommandInput;
};

const targetS3ParametersSchema = baseS3ParametersSchema.extend({
  s3Config: z.looseObject({
    Bucket: z.string(),
    Key: z.string(),
  }),
});
export type TargetS3Parameters = z.infer<typeof targetS3ParametersSchema> & {
  s3Config: PutObjectCommandInput;
};

const dynamoTablePrimaryKeySchema = z.object({
  pk: z.string(),
  sk: z.string().optional(),
});
export type DynamoTablePrimaryKey = z.infer<typeof dynamoTablePrimaryKeySchema>;

const targetDynamoParametersSchema = baseDynamoParametersSchema.extend({
  purgeTable: z.boolean().optional(),
  tablePrimaryKey: dynamoTablePrimaryKeySchema.optional(),
  maxNumberOfRecordsToInsert: z.number().optional(),
});
export type TargetDynamoParameters = z.infer<typeof targetDynamoParametersSchema>;

export const configSchema = z.object({
  source: z.discriminatedUnion('type', [sourceDynamoParametersSchema, sourceS3ParametersSchema]),
  target: z.discriminatedUnion('type', [targetDynamoParametersSchema, targetS3ParametersSchema]),
});

export type Config = z.infer<typeof configSchema>;

export type DynamoData = Record<string, unknown>[];
export type SourceData = DynamoData | Uint8Array | null;

export type S3Data = Uint8Array;

export type SourceType = 'dynamo' | 's3';
export type TargetType = 'dynamo' | 's3';

export interface AWSConfig {
  accessKeyId: string;
  region: string;
  secretAccessKey: string;
  sessionToken: string;
}
