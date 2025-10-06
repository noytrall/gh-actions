import * as core from "@actions/core";
import fs from "node:fs";
import path from "node:path";
import { configSchema, type Config } from "./type.js";
import sourceDynamo from "./source-dynamo.js";
import targetDynamo from "./target-dynamo.js";
import { resultFail } from "./utils/result.js";

async function run() {
  try {
    const configPath = core.getInput("config-path", { required: true });
    console.log("configPath", configPath);
    console.log("GITHUB_WORKSPACE", process.env.GITHUB_WORKSPACE!);
    const fullPath = path.resolve(process.env.GITHUB_WORKSPACE!, configPath);
    console.log("fullPath", fullPath);

    const config: Config = JSON.parse(fs.readFileSync(fullPath, "utf8"));

    const result = configSchema.safeParse(config);

    if (1 === 1) {
      console.log("RESULT", JSON.stringify(result, null, 2));
      return result;
    }

    if (result.error) {
      console.log("resultFail", JSON.stringify(result.error, null, 2));
      return resultFail(400, result.error.issues);
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
