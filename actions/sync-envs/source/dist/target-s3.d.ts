import type { AWSConfig, SourceData, TargetS3Parameters } from "./utils/types.js";
export default function (sourceData: SourceData, { accessKeyId, region, secretAccessKey, sessionToken }: AWSConfig, { s3Config }: Omit<TargetS3Parameters, "type">): Promise<import("@aws-sdk/client-s3").PutObjectCommandOutput>;
