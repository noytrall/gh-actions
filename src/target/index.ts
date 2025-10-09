import * as core from "@actions/core";
import fs from "node:fs";
import path from "node:path";
import { getErrorMessage } from "../utils/errors.js";
import { type AWSConfig, type Config, type SourceData } from "../utils/type.js";
import targetDynamo from "../target-dynamo.js";
import targetS3 from "../target-s3.js";

async function run() {
  try {
    const configPath = core.getInput("config-path", { required: true });
    core.info(`configPath: ${JSON.stringify(configPath, null, 2)}`);
    core.info("GITHUB_WORKSPACE: " + process.env.GITHUB_WORKSPACE!);
    const fullPath = path.resolve(process.env.GITHUB_WORKSPACE!, configPath);
    core.info("fullPath: " + fullPath);
    const transformedData = core.getInput("transformed-data");

    console.log("transformedData :>> ", transformedData);

    const config: Config = JSON.parse(fs.readFileSync(fullPath, "utf8"));

    const sourceDataInput = core.getInput("source-data", { required: true });

    console.log("SOURCE DATA INPUT", sourceDataInput.slice(0, 200));

    const parsed = JSON.parse(sourceDataInput) as {
      data: SourceData;
      s3SourcedMetadata: Record<string, string> | undefined;
      s3SourcedContentType: string | undefined;
    };

    let { s3SourcedContentType, s3SourcedMetadata } = parsed;

    let data;

    try {
      data = JSON.parse(transformedData);
      core.info("Transformed data");
    } catch (error) {
      data = parsed.data;
      core.info("Data from source");
    }

    const sourceType = config.source.type;
    const targetType = config.target.type;
    const targetAwsConfig: AWSConfig = {
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION!,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN!,
    };

    // @ts-ignore
    core.info("DATA: " + typeof data);

    if (targetType === "dynamo") {
      const {
        target: { dynamoTableName, purgeTable, tablePrimaryKey },
      } = config;
      await targetDynamo(data, sourceType, targetAwsConfig, {
        dynamoTableName,
        purgeTable,
        tablePrimaryKey,
      });
    } else if (targetType === "s3") {
      const {
        target: { s3Config },
      } = config;

      if (sourceType === "dynamo") s3SourcedContentType = "application/json";

      await targetS3(data, targetAwsConfig, {
        s3Config: {
          Metadata: s3SourcedMetadata,
          ContentType: s3SourcedContentType,
          ...s3Config,
        },
      });
    }
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}

run();
