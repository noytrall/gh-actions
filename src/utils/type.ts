import type {
  GetObjectCommandInput,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import z from "zod";

type _BaseAwsResourceParameters<P> = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
} & P;

type _BaseDynamoParameters = _BaseAwsResourceParameters<{
  type: "dynamo";
  dynamoTableName: string;
}>;

type _BaseS3Parameters = _BaseAwsResourceParameters<{
  type: "s3";
  s3BucketName: string;
  s3Key: string;
}>;

type _HttpRequestParameters = {
  type: "http";
  url: string;
  httpMethod: string;
  apiKey?: string;
  apiKeyHeaderAttribute?: string;
  apiKeyParamName?: string;
};

type _Source =
  | _BaseDynamoParameters
  | _BaseS3Parameters
  | _HttpRequestParameters;

type _Target =
  | (_BaseDynamoParameters &
      (
        | { purgeTable: false; tablePK?: string; tableSK?: string }
        | { purgeTable: true; tablePK: string; tableSK?: string }
      ))
  | _BaseS3Parameters
  | _HttpRequestParameters;

type _Config = {
  source: _Source;
  target: _Target;
  piiStuff?: boolean;
  dataTransformer?:
    | {
        type: "http";
        httpMethod: string;
        endpointUrl: string;
        apiKey?: string;
        apiKeyHeaderAttribute?: string;
        apiKeyParamName?: string;
      }
    | {
        type: "function";
      };
};

const baseAwsResourceParameterSchema = z.object({
  region: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  sessionToken: z.string(),
});

type BaseAwsResourceParameter = z.infer<typeof baseAwsResourceParameterSchema>;

const baseDynamoParametersSchema = baseAwsResourceParameterSchema.extend({
  type: z.literal("dynamo"),
  dynamoTableName: z.string(),
});
export type BaseDynamoParameters = z.infer<typeof baseDynamoParametersSchema>;

const baseS3ParametersSchema = baseAwsResourceParameterSchema.extend({
  type: z.literal("s3"),
});
type BaseS3Parameters = z.infer<typeof baseS3ParametersSchema>;

const sourceS3ParametersSchema = baseS3ParametersSchema.extend({
  s3Props: z.looseObject({
    Bucket: z.string(),
    Key: z.string(),
  }),
});
export type SourceS3Parameters = z.infer<typeof sourceS3ParametersSchema> & {
  s3Props: GetObjectCommandInput;
};
const targetS3ParametersSchema = baseS3ParametersSchema.extend({
  s3Props: z.looseObject({
    Bucket: z.string(),
    Key: z.string(),
  }),
});
export type TargetS3Parameters = z.infer<typeof targetS3ParametersSchema> & {
  s3Props: PutObjectCommandInput;
};

const dynamoTablePrimaryKeySchema = z.object({
  pk: z.string(),
  sk: z.string().optional(),
});
export type DynamoTablePrimaryKey = z.infer<typeof dynamoTablePrimaryKeySchema>;

const targetDynamoParametersSchema = baseDynamoParametersSchema.extend({
  purgeTable: z.boolean().optional(),
  tablePrimaryKey: dynamoTablePrimaryKeySchema.optional(),
});

export type TargetDynamoParameters = z.infer<
  typeof targetDynamoParametersSchema
>;

export const configSchema = z.object({
  source: z.discriminatedUnion("type", [
    baseDynamoParametersSchema,
    sourceS3ParametersSchema,
  ]),
  target: z.discriminatedUnion("type", [
    targetDynamoParametersSchema,
    targetS3ParametersSchema,
  ]),
});

export type Config = z.infer<typeof configSchema>;

export type DynamoData = Array<Record<string, unknown>>;
export type S3Data = Uint8Array;
