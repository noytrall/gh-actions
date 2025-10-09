import * as core from "@actions/core";
import fs from "node:fs";
import path from "node:path";
import sourceDynamo from "../source-dynamo.js";
import sourceS3 from "../source-s3.js";
import targetDynamo from "../target-dynamo.js";
import targetS3 from "../target-s3.js";
import { getErrorMessage } from "../utils/errors.js";
import {
  configSchema,
  type AWSConfig,
  type Config,
  type SourceData,
} from "../utils/type.js";

async function run() {
  try {
    const configPath = core.getInput("config-path", { required: true });
    core.info(`configPath: ${JSON.stringify(configPath, null, 2)}`);
    core.info("GITHUB_WORKSPACE: " + process.env.GITHUB_WORKSPACE!);
    const fullPath = path.resolve(process.env.GITHUB_WORKSPACE!, configPath);
    core.info("fullPath: " + fullPath);

    const config: Config = JSON.parse(fs.readFileSync(fullPath, "utf8"));

    const result = configSchema.safeParse(config);

    const sourceAwsRegion = core.getInput("source-aws-region", {
      required: true,
    });
    const sourceAwsAccessKeyId = core.getInput("source-aws-access-key-id", {
      required: true,
    });
    const sourceAwsSecretAccessKey = core.getInput(
      "source-aws-secret-access-key",
      {
        required: true,
      }
    );
    const sourceAwsSessionToken = core.getInput("source-aws-session-token", {
      required: true,
    });
    const targetAwsRegion = core.getInput("target-aws-region", {
      required: true,
    });
    const targetAwsAccessKeyId = core.getInput("target-aws-access-key-id", {
      required: true,
    });
    const targetAwsSecretAccessKey = core.getInput(
      "target-aws-secret-access-key",
      {
        required: true,
      }
    );
    const targetAwsSessionToken = core.getInput("target-aws-session-token", {
      required: true,
    });

    core.setSecret(sourceAwsAccessKeyId);
    core.setSecret(sourceAwsSecretAccessKey);
    core.setSecret(sourceAwsSessionToken);
    core.setSecret(targetAwsAccessKeyId);
    core.setSecret(targetAwsSecretAccessKey);
    core.setSecret(targetAwsSessionToken);

    core.info("CONFIG: " + JSON.stringify(config, null, 2));

    if (result.error) {
      core.error("parseResult: " + JSON.stringify(result, null, 2));
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }

    let sourceData: SourceData = null;
    let s3SourcedMetadata: Record<string, string> | undefined = undefined;
    let s3SourcedContentType: string | undefined;

    const sourceType = config.source.type;
    const targetType = config.target.type;

    const sourceAwsConfig: AWSConfig = {
      region: sourceAwsRegion,
      accessKeyId: sourceAwsAccessKeyId,
      secretAccessKey: sourceAwsSecretAccessKey,
      sessionToken: sourceAwsSessionToken,
    };
    const targetAwsConfig: AWSConfig = {
      region: targetAwsRegion,
      accessKeyId: targetAwsAccessKeyId,
      secretAccessKey: targetAwsSecretAccessKey,
      sessionToken: targetAwsSessionToken,
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
    }

    if (!sourceData) {
      // TODO: Handle this
      throw new Error("Somehow, sourceData is null");
    }

    if (targetType === "dynamo") {
      const {
        target: { dynamoTableName, purgeTable, tablePrimaryKey },
      } = config;
      await targetDynamo(sourceData, sourceType, targetAwsConfig, {
        dynamoTableName,
        purgeTable,
        tablePrimaryKey,
      });
    } else if (targetType === "s3") {
      const {
        target: { s3Config },
      } = config;

      if (sourceType === "dynamo") s3SourcedContentType = "application/json";

      await targetS3(sourceData, targetAwsConfig, {
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
