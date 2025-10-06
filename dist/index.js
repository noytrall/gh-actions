"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const source_dynamo_js_1 = __importDefault(require("./source-dynamo.js"));
const target_dynamo_js_1 = __importDefault(require("./target-dynamo.js"));
async function run() {
    try {
        const configPath = core.getInput("config-path", { required: true });
        const fullPath = path_1.default.resolve(process.env.GITHUB_WORKSPACE, configPath);
        // TODO: validate structure of config
        const config = JSON.parse(fs_1.default.readFileSync(fullPath, "utf8"));
        let sourceData = null;
        if (config.source.type === "dynamo") {
            const { source: { region, accessKeyId, secretAccessKey, dynamoTableName, sessionToken, }, } = config;
            const sourceDynamoResult = await (0, source_dynamo_js_1.default)({
                region,
                accessKeyId,
                secretAccessKey,
                tableName: dynamoTableName,
                sessionToken,
            });
            if (!sourceDynamoResult.success) {
                return;
            }
            sourceData = sourceDynamoResult.value;
        }
        else if (config.source.type === "s3") {
        }
        if (!sourceData) {
            // TODO: Handle this
            return;
        }
        if (config.target.type === "dynamo") {
            const { target: { accessKeyId, dynamoTableName, purgeTable, region, secretAccessKey, sessionToken, tablePK, tableSK, }, } = config;
            const targetDynamoResult = await (0, target_dynamo_js_1.default)({
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
        }
        console.log(`Mode set to: ${config.source.type}`);
    }
    catch (error) {
        core.setFailed(typeof error === "string" ? error : error.message);
    }
}
run();
