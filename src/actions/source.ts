import * as core from "@actions/core";
import fs from "node:fs";
import path from "node:path";
import sourceDynamo from "../source-dynamo.js";
import sourceS3 from "../source-s3.js";
import {
  type AWSConfig,
  type Config,
  type SourceData,
} from "../utils/types.js";
import { getErrorMessage } from "../utils/errors.js";

async function run() {
  try {
    const configPath = core.getInput("config-path", { required: true });
    core.info(`configPath: ${JSON.stringify(configPath, null, 2)}`);
    core.info("GITHUB_WORKSPACE: " + process.env.GITHUB_WORKSPACE!);
    const fullPath = path.resolve(process.env.GITHUB_WORKSPACE!, configPath);
    core.info("fullPath: " + fullPath);

    const config: Config = JSON.parse(fs.readFileSync(fullPath, "utf8"));

    let sourceData: SourceData = null;
    let s3SourcedMetadata: Record<string, string> | undefined = undefined;
    let s3SourcedContentType: string | undefined;

    const sourceType = config.source.type;

    const sourceAwsConfig: AWSConfig = {
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION!,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN!,
    };

    if (sourceType === "dynamo") {
      const {
        source: { dynamoTableName },
      } = config;
      sourceData = await sourceDynamo(sourceAwsConfig, {
        dynamoTableName,
      });
    } else if (sourceType === "s3") {
      const {
        source: { s3Config },
      } = config;
      const response = await sourceS3(sourceAwsConfig, {
        s3Config,
      });

      if (!response.Body) throw new Error("No Body attribute in response");
      sourceData = await response.Body.transformToByteArray();
      s3SourcedContentType = response.ContentType;
      s3SourcedMetadata = response.Metadata;
      core.setOutput("s3SourcedContentType", s3SourcedContentType);
      core.setOutput("s3SourcedMetadata", s3SourcedMetadata);
    }

    if (!sourceData) {
      // TODO: Handle this
      throw new Error("Somehow, sourceData is null");
    }

    core.setOutput(
      "source-data",
      JSON.stringify({
        data: sourceData,
        s3SourcedMetadata,
        s3SourcedContentType,
      })
    );
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}

run();
