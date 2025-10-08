import type { SourceS3Parameters } from "./utils/type.js";
export default function ({ accessKeyId, region, secretAccessKey, sessionToken, s3Config, }: Omit<SourceS3Parameters, "type">): Promise<import("@aws-sdk/client-s3").GetObjectCommandOutput>;
