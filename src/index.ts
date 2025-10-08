import * as core from "@actions/core";
import fs from "node:fs";
import path from "node:path";
import { isUint8Array } from "node:util/types";
import sourceDynamo from "./source-dynamo.js";
import sourceS3 from "./source-s3.js";
import targetDynamo from "./target-dynamo.js";
import targetS3 from "./target-s3.js";
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

    core.info("CONFIG: " + JSON.stringify(config, null, 2));

    if (result.error) {
      core.error("parseResult: " + JSON.stringify(result, null, 2));
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }

    let sourceData: Array<Record<string, any>> | Uint8Array | null = null;
    let s3SourcedMetadata: Record<string, string> | undefined = undefined;
    let s3SourcedContentType: string | undefined;

    const sourceType = config.source.type;
    const targetType = config.target.type;

    if (sourceType === "dynamo") {
      const {
        source: {
          region,
          accessKeyId,
          secretAccessKey,
          dynamoTableName,
          sessionToken,
        },
      } = config;
      sourceData = await sourceDynamo({
        region,
        accessKeyId,
        secretAccessKey,
        dynamoTableName,
        sessionToken,
      });
    } else if (sourceType === "s3") {
      const {
        source: {
          accessKeyId,
          region,
          secretAccessKey,
          sessionToken,
          s3Config,
        },
      } = config;
      const response = await sourceS3({
        accessKeyId,
        region,
        secretAccessKey,
        sessionToken,
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
      if (sourceType === "s3" && isUint8Array(sourceData)) {
        try {
          const decoder = new TextDecoder();
          const jsonString = decoder.decode(sourceData);

          sourceData = JSON.parse(jsonString);
        } catch (error) {
          core.error(
            "Failure converting s3 Uint8Array to json to insert data in dynamoTable"
          );
          throw error;
        }
      }
      if (
        !isArrayOfRecords(
          sourceData,
          // If source of data is "dynamo", than data is already an array of records, unless it has been altered by some middleware (functionality yet to be implemented)
          sourceType === "dynamo" || undefined
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
      await targetDynamo(sourceData, {
        accessKeyId,
        region,
        secretAccessKey,
        dynamoTableName,
        purgeTable,
        sessionToken,
        tablePrimaryKey,
      });
    } else if (targetType === "s3") {
      if (sourceType === "dynamo") s3SourcedContentType = "application/json";

      const {
        target: {
          accessKeyId,
          region,
          s3Config,
          secretAccessKey,
          sessionToken,
        },
      } = config;

      if (isArrayOfRecords(sourceData)) {
        const encoder = new TextEncoder();
        sourceData = encoder.encode(JSON.stringify(sourceData));
      }

      if (!isUint8Array(sourceData)) {
        throw new Error("Something HERE");
      }

      await targetS3({
        accessKeyId,
        region,
        s3Config: {
          Metadata: s3SourcedMetadata,
          ContentType: s3SourcedContentType,
          Body: sourceData,
          ...s3Config,
        },
        secretAccessKey,
        sessionToken,
      });
    }
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}

run();
