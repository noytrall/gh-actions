type BaseAwsResourceParameters<P> = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
} & P;

type BaseDynamoParameters = BaseAwsResourceParameters<{
  type: "dynamo";
  dynamoTableName: string;
}>;

type BaseS3Parameters = BaseAwsResourceParameters<{
  type: "s3";
  s3BucketName: string;
  s3Key: string;
}>;

type HttpRequestParameters = {
  type: "http";
  url: string;
  httpMethod: string;
  apiKey?: string;
  apiKeyHeaderAttribute?: string;
  apiKeyParamName?: string;
};

type Source = BaseDynamoParameters | BaseS3Parameters | HttpRequestParameters;

type Target =
  | (BaseDynamoParameters &
      (
        | { purgeTable: false; tablePK?: string; tableSK?: string }
        | { purgeTable: true; tablePK: string; tableSK?: string }
      ))
  | BaseS3Parameters
  | HttpRequestParameters;

export type Config = {
  source: Source;
  target: Target;
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
