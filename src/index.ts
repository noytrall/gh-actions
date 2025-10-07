import * as core from "@actions/core";
import fs from "node:fs";
import path from "node:path";
import sourceDynamo from "./source-dynamo.js";
import targetDynamo from "./target-dynamo.js";
import { getErrorMessage } from "./utils/errors.js";
import { isArrayOfRecords } from "./utils/nodash.js";
import { configSchema, type Config } from "./utils/type.js";

async function run() {
  try {
    const configPath = core.getInput("config-path", { required: true });
    core.info(`configPath: ${JSON.stringify(configPath, null, 2)}`);
    core.info("GITHUB_WORKSPACE: " + process.env.GITHUB_WORKSPACE!);
    const fullPath = path.resolve(process.env.GITHUB_WORKSPACE!, configPath);
    core.info("fullPath: " + fullPath);

    const config: Config = JSON.parse(fs.readFileSync(fullPath, "utf8"));

    const result = configSchema.safeParse(config);

    core.setSecret(config.source.accessKeyId);
    core.setSecret(config.source.secretAccessKey);
    core.setSecret(config.source.sessionToken);
    core.setSecret(config.target.accessKeyId);
    core.setSecret(config.target.secretAccessKey);
    core.setSecret(config.target.sessionToken);

    core.info("CONFIG: " + JSON.stringify(config));

    if (result.error) {
      core.error("parseResult: " + JSON.stringify(result, null, 2));
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }

    let sourceData: unknown = null;

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

      sourceData = sourceDynamoResult;
    } else if (config.source.type === "s3") {
    }

    if (!sourceData) {
      // TODO: Handle this
      throw new Error("Somehow, sourceData is null");
    }

    if (config.target.type === "dynamo") {
      if (
        !isArrayOfRecords(
          sourceData,
          // If source of data is "dynamo", than data is already an array of records, unless it has been altered by some middleware (functionality yet to be implemented)
          config.source.type === "dynamo" || undefined
        )
      )
        throw new Error(
          "Data to insert into dynamoDB table is malformed. Requires an array of records"
        );

      const {
        target: {
          accessKeyId,
          dynamoTableName,
          purgeTable,
          region,
          secretAccessKey,
          sessionToken,
          tablePrimaryKey,
        },
      } = config;
      const targetDynamoResult = await targetDynamo({
        accessKeyId,
        region,
        secretAccessKey,
        tableName: dynamoTableName,
        purgeTable,
        sessionToken,
        tablePrimaryKey,
        data: sourceData,
      });
    }
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}

run();
