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
type BaseDynamoParameters = z.infer<typeof baseDynamoParametersSchema>;

const baseS3ParametersSchema = baseAwsResourceParameterSchema.extend({
  type: z.literal("s3"),
  s3BucketName: z.string(),
  s3Key: z.string(),
});
type BaseS3Parameters = z.infer<typeof baseS3ParametersSchema>;

const targetDynamoParametersSchema = baseDynamoParametersSchema.extend({
  purgeTable: z.boolean().optional(),
  tablePK: z.string().optional(),
  tableSK: z.string().optional(),
});
/* .superRefine((val, ctx) => {
    if (val.purgeTable === true && !val.tablePK?.length)
      ctx.addIssue({
        code: "custom",
        expected: "string",
        message: "tablePK is required when purgeTable is enabled",
      });
  }) */
type TargetDynamoParameters = z.infer<typeof targetDynamoParametersSchema>;

export const configSchema = z.object({
  source: z.discriminatedUnion("type", [
    baseDynamoParametersSchema,
    baseS3ParametersSchema,
  ]),
  target: z.discriminatedUnion("type", [
    targetDynamoParametersSchema,
    baseS3ParametersSchema,
  ]),
});

export type Config = z.infer<typeof configSchema>;
