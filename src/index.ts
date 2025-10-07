import * as core from "@actions/core";
import fs from "node:fs";
import path from "node:path";
import sourceDynamo from "./source-dynamo.js";
import targetDynamo from "./target-dynamo.js";
import { configSchema, type Config } from "./type.js";

async function run() {
  try {
    const configPath = core.getInput("config-path", { required: true });
    core.info(`configPath: ${JSON.stringify(configPath, null, 2)}`);
    core.info("GITHUB_WORKSPACE: " + process.env.GITHUB_WORKSPACE!);
    const fullPath = path.resolve(process.env.GITHUB_WORKSPACE!, configPath);
    core.info("fullPath: " + fullPath);

    const config: Config = JSON.parse(fs.readFileSync(fullPath, "utf8"));

    const result = configSchema.safeParse(config);

    if (result.error) {
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }

    let sourceData: Array<Record<string, unknown>> | null = null;

    if (config.source.type === "dynamo") {
      const {
        source: {
          region,
          accessKeyId,
          secretAccessKey,
          dynamoTableName,
          sessionToken,
        },
      } = config;
      const sourceDynamoResult = await sourceDynamo({
        region,
        accessKeyId,
        secretAccessKey,
        tableName: dynamoTableName,
        sessionToken,
      });

      if (!sourceDynamoResult.success) {
        throw new Error(sourceDynamoResult.message);
      }

      sourceData = sourceDynamoResult.value;
    } else if (config.source.type === "s3") {
    }

    if (!sourceData) {
      // TODO: Handle this
      throw new Error("Somehow, sourceData is null");
    }

    if (config.target.type === "dynamo") {
      const {
        target: {
          accessKeyId,
          dynamoTableName,
          purgeTable,
          region,
          secretAccessKey,
          sessionToken,
          tablePK,
          tableSK,
        },
      } = config;
      const targetDynamoResult = await targetDynamo({
        accessKeyId,
        region,
        secretAccessKey,
        tableName: dynamoTableName,
        purgeTable,
        sessionToken,
        tablePK,
        tableSK,
        data: sourceData,
      });
      core.info(
        "targetDynamoResult: " + JSON.stringify(targetDynamoResult, null, 2)
      );
      if (!targetDynamoResult.success) {
        throw new Error(targetDynamoResult.message);
      }
    }
  } catch (error) {
    const message =
      typeof error === "string" ? error : (error as Error).message;
    core.setFailed(message);
  }
}

run();
