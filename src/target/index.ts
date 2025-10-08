import * as core from "@actions/core";
import fs from "node:fs";
import path from "node:path";
import { getErrorMessage } from "../utils/errors.js";
import { type Config } from "../utils/type.js";

async function run() {
  try {
    const configPath = core.getInput("config-path", { required: true });
    core.info(`configPath: ${JSON.stringify(configPath, null, 2)}`);
    core.info("GITHUB_WORKSPACE: " + process.env.GITHUB_WORKSPACE!);
    const fullPath = path.resolve(process.env.GITHUB_WORKSPACE!, configPath);
    core.info("fullPath: " + fullPath);

    const config: Config = JSON.parse(fs.readFileSync(fullPath, "utf8"));

    const sourceData = core.getInput("sourceData", { required: true });
    core.info("sourceData: " + JSON.stringify(sourceData, null, 2));
  } catch (error) {
    core.setFailed(getErrorMessage(error));
  }
}

run;
