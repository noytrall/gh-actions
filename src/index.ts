import * as core from "@actions/core";
import fs from "fs";
import path from "path";
import type { Config } from "./type.js";
import sourceDynamo from "./source-dynamo.js";
import targetDynamo from "./target-dynamo.js";

async function run() {
  try {
    const configPath = core.getInput("config-path", { required: true });
    console.log("configPath", configPath);
    console.log("GITHUB_WORKSPACE", process.env.GITHUB_WORKSPACE!);
    const fullPath = path.resolve(process.env.GITHUB_WORKSPACE!, configPath);
    console.log("fullPath", fullPath);

    // TODO: validate structure of config
    const config: Config = JSON.parse(fs.readFileSync(fullPath, "utf8"));

    console.log("config", JSON.stringify(config));
    if (1 === 1) return;

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
        console.log("sourceDynamoResult", sourceDynamoResult.message);
        return;
      }

      sourceData = sourceDynamoResult.value;
    } else if (config.source.type === "s3") {
    }

    if (!sourceData) {
      // TODO: Handle this
      return;
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
      if (!targetDynamoResult.success) {
        console.log("targetDynamoResult", targetDynamoResult.message);
        return targetDynamoResult;
      }
    }

    console.log(`Mode set to: ${config.source.type}`);
  } catch (error) {
    console.log(typeof error === "string" ? error : (error as Error).message);
  }
}

run();
