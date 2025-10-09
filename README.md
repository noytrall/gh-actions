---
# AWS Cross-Account Data Sync GitHub Action

This GitHub Action enables seamless **data transfer between two AWS accounts**, supporting both **DynamoDB** and **S3** as source and target resources.
It can be run as a **single end-to-end action** or split into **two separate actions** for greater flexibility — for example, if you need to insert a custom data transformation step between fetching and writing data.
---

## 🚀 Features

- Move data between **different AWS accounts**.
- Supports **DynamoDB → DynamoDB**, **S3 → S3**, and **DynamoDB ↔ S3**.
- Configurable via a single JSON config file.
- Option to **purge the target DynamoDB table** before writing.
- Supports **intermediate transformations** (e.g., removing PII data) between source and target.

---

## ⚙️ Configuration File

The GitHub Action expects a JSON config file with the following TypeScript shape:

```ts
type Config = {
  source:
    | {
        type: "dynamo";
        dynamoTableName: string;
      }
    | {
        type: "s3";
        s3Config: {
          [x: string]: unknown;
          Bucket: string;
          Key: string;
        };
      };
  target:
    | {
        type: "dynamo";
        dynamoTableName: string;
        purgeTable?: boolean;
        tablePrimaryKey?: {
          pk: string;
          sk?: string;
        };
      }
    | {
        type: "s3";
        s3Config: {
          [x: string]: unknown;
          Bucket: string;
          Key: string;
        };
      };
};
```

### Notes:

- For S3 sources, `s3Config` can include any valid `GetObjectCommand` parameters.
- For S3 targets, `s3Config` can include any valid `PutObjectCommand` parameters.

---

## 🧩 Available Actions

### 1. **Full Action**

Runs the entire process — fetching from the source and writing to the target.

**File:** `actions/sync-envs/full/action.yaml`

**Inputs:**

- `config-path`: Path to the JSON config file.
- Source and target AWS credentials (region, access key, secret, and session token).

**Example:**

```yaml
- name: env sync action step
  uses: cinch/gh-actions/actions/sync-envs/full@main
  with:
    config-path: ./path/to/config/config-file.json
    target-aws-region: eu-west-1
    target-aws-access-key-id: ${{ steps.target-aws-creds.outputs.aws-access-key-id }}
    target-aws-secret-access-key: ${{ steps.target-aws-creds.outputs.aws-secret-access-key }}
    target-aws-session-token: ${{ steps.target-aws-creds.outputs.aws-session-token }}
    source-aws-region: eu-west-1
    source-aws-access-key-id: ${{ steps.source-aws-creds.outputs.aws-access-key-id }}
    source-aws-secret-access-key: ${{ steps.source-aws-creds.outputs.aws-secret-access-key }}
    source-aws-session-token: ${{ steps.source-aws-creds.outputs.aws-session-token }}
```

---

### 2. **Separate Source and Target Actions**

These can be used independently to allow for **custom middleware** or transformation logic.

#### **Source Action**

Fetches data from the source resource.

**File:** `actions/sync-envs/source/action.yaml`

**Inputs:**

- `config-path`: Path to the JSON config file.

**Outputs:**

- `source-data`: The raw data fetched from the source.

#### **Target Action**

Writes data to the target resource.

**File:** `actions/sync-envs/target/action.yaml`

**Inputs:**

- `config-path`: Path to the JSON config file.
- `source-data`: Data fetched from the source.
- `transformed-data`: (Optional) Data after middleware processing.

---

## 🧠 Example Workflow:

An example workflow showing both approaches:

- **One-step** full sync.
- **Two-step** sync with optional middleware.

```yaml
jobs:
  one_step:
    runs-on: ubuntu-latest
    steps:

     - name: Checkout
        uses: actions/checkout@v5

      - name: Configure Source AWS credentials
        id: source-aws-creds
        uses: aws-actions/configure-aws-credentials@v5
        with:
          role-to-assume: arn:aws:iam::source-account:role/example-role
          role-session-name: example-session-name
          aws-region: eu-west-1
          audience: sts.amazonaws.com
          output-credentials: true

      - name: Configure Target AWS credentials
        id: target-aws-creds
        uses: aws-actions/configure-aws-credentials@v5
        with:
          role-to-assume: arn:aws:iam::target-account:role/example-role
          role-session-name: example-session-name
          aws-region: eu-west-1
          audience: sts.amazonaws.com
          output-credentials: true

      - name: Run full sync
        uses: cinch/gh-actions/actions/sync-envs/full@main
        with:
          config-path: ./path/to/config/config-file.json
          source-aws-access-key-id: ${{ steps.source-aws-creds.outputs.aws-access-key-id }}
          source-aws-secret-access-key: ${{ steps.source-aws-creds.outputs.aws-secret-access-key }}
          source-aws-session-token: ${{ steps.source-aws-creds.outputs.aws-session-token }}
          target-aws-access-key-id: ${{ steps.target-aws-creds.outputs.aws-access-key-id }}
          target-aws-secret-access-key: ${{ steps.target-aws-creds.outputs.aws-secret-access-key }}
          target-aws-session-token: ${{ steps.target-aws-creds.outputs.aws-session-token }}
```

```yaml
jobs:
  two_steps:
    name: Two steps to sync accounts
    runs-on: ubuntu-latest

    steps:
      # To use this repository's private action,
      # you must check out the repository
      - name: Checkout
        uses: actions/checkout@v5

      - name: Configure Source AWS credentials
        id: source-aws-creds
        uses: aws-actions/configure-aws-credentials@v5
        with:
          role-to-assume: arn:aws:iam::source-account:role/example-role
          role-session-name: example-session-name
          aws-region: eu-west-1
          audience: sts.amazonaws.com

      - name: get data from Source environment
        id: source-data
        uses: noytrall/gh-actions/actions/sync-envs/source@main
        with:
          config-path: ./configs/env-sync.json

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install @actions/core

      - name: Run Middleware file
        id: middleware
        env:
          SOURCE_DATA: ${{ steps.source-data.outputs.source-data }}
        run: node src/scripts/gh-actions/source-target-middleware.js

      - name: Configure Target AWS credentials
        id: target-aws-creds
        uses: aws-actions/configure-aws-credentials@v5
        with:
          role-to-assume: arn:aws:iam::target-account:role/example-role
          role-session-name: example-session-name
          aws-region: eu-west-1
          audience: sts.amazonaws.com
          output-credentials: true

      - name: put data in Target environment
        id: target-sync-env
        uses: noytrall/gh-actions/actions/sync-envs/target@main
        with:
          config-path: ./configs/env-sync.json
          source-data: ${{ steps.source-data.outputs.source-data }}
          transformed-data: ${{ steps.middleware.outputs.transformed-data }}
```

---

## 🧩 Middleware Example

A middleware script can process the source data and output a transformed version via `@actions/core`:

```js
const core = require("@actions/core");

(async () => {
  const rawData = JSON.parse(process.env.SOURCE_DATA);
  const sanitizedData = rawData.filter((item) => !item.containsSensitiveInfo);
  core.setOutput("transformed-data", JSON.stringify(sanitizedData));
})();
```

---
