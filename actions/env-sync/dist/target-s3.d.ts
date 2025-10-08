import type { TargetS3Parameters } from "./utils/type.js";
export default function ({ accessKeyId, region, secretAccessKey, sessionToken, s3Config, }: Omit<TargetS3Parameters, "type">): Promise<import("@aws-sdk/client-s3").PutObjectCommandOutput>;
