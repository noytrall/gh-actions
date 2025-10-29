# DynamoDB Table Migration Action

This GitHub Action automates **data migration between two DynamoDB tables**, even if they are in **different AWS accounts or regions**.  
It supports optional **data filtering and transformation** via a custom JavaScript file.

---

## 🚀 Features

- Copy data from one DynamoDB table to another.
- Works across **different AWS regions and accounts**.
- Optionally **purge the target table** before inserting new data.
- Supports a **JavaScript-based data filter/transformer**.
- Optional **limit** on the number of items to transfer.

---

## 🧩 Inputs

### Required Inputs

| Name                           | Description                                      | Example                                       |
| ------------------------------ | ------------------------------------------------ | --------------------------------------------- |
| `config-path`                  | Path to the JSON configuration file (see below). | `./config.json`                               |
| `source-aws-region`            | AWS region of the source table.                  | `eu-west-1`                                   |
| `source-aws-access-key-id`     | Access key ID for the source AWS account.        | `${{ secrets.SOURCE_AWS_ACCESS_KEY_ID }}`     |
| `source-aws-secret-access-key` | Secret access key for the source AWS account.    | `${{ secrets.SOURCE_AWS_SECRET_ACCESS_KEY }}` |
| `source-aws-session-token`     | Session token for the source AWS account.        | `${{ secrets.SOURCE_AWS_SESSION_TOKEN }}`     |
| `target-aws-region`            | AWS region of the target table.                  | `us-west-2`                                   |
| `target-aws-access-key-id`     | Access key ID for the target AWS account.        | `${{ secrets.TARGET_AWS_ACCESS_KEY_ID }}`     |
| `target-aws-secret-access-key` | Secret access key for the target AWS account.    | `${{ secrets.TARGET_AWS_SECRET_ACCESS_KEY }}` |
| `target-aws-session-token`     | Session token for the target AWS account.        | `${{ secrets.TARGET_AWS_SESSION_TOKEN }}`     |

### Optional Inputs

| Name          | Description                                                                                    | Example       |
| ------------- | ---------------------------------------------------------------------------------------------- | ------------- |
| `script-path` | Path to a JavaScript file that filters or transforms items before writing to the target table. | `./filter.js` |

---

## ⚙️ Configuration File

The configuration file defines how the data migration should be performed.

**Shape:**

```ts
type Config = {
  source: {
    dynamoTableName: string;
  };
  target: {
    dynamoTableName: string;
    purgeTable: boolean;
  };
  maxNumberOfItems?: number | undefined;
};
```

**Example:**

```json
{
  "source": {
    "dynamoTableName": "UsersTable"
  },
  "target": {
    "dynamoTableName": "UsersBackup",
    "purgeTable": true
  },
  "maxNumberOfItems": 1000
}
```

---

## 🧪 Filter Script (Optional)

You can optionally specify a JavaScript file to filter or transform each item before it is written to the target table.

The script must **export a function** like this:

```js
// filter.js
function run(data) {
  return { data: data.filter((d) => !d.isPII) };
}

module.exports = { run };
```

If `script-path` is not provided, items are copied as-is.

---

## 🧰 Example Workflow

```yaml
name: Sync Envs

on:
  workflow_dispatch:

permissions:
  contents: read
  id-token: write

jobs:
  one_action:
    name: a job to sync envs
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: Configure Source AWS credentials
        id: source-aws-creds
        uses: aws-actions/configure-aws-credentials@v5
        with:
          role-to-assume: arn:aws:iam::511560072567:role/infrastructure/sd-cinch-labs-sites-component
          role-session-name: vehicle-data_deploy_role
          aws-region: eu-west-1
          audience: sts.amazonaws.com
          output-credentials: true

      - name: Configure Target AWS credentials
        id: target-aws-creds
        uses: aws-actions/configure-aws-credentials@v5
        with:
          role-to-assume: arn:aws:iam::511560072567:role/infrastructure/sd-cinch-labs-sites-component
          role-session-name: vehicle-data_deploy_role
          aws-region: eu-west-1
          audience: sts.amazonaws.com
          output-credentials: true

      - name: env sync action step
        uses: noytrall/gh-actions/actions/sync-envs/full@main
        with:
          config-path: ./configs/env-sync.json
          script-path: ./src/scripts/gh-actions/transform-data.js
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

## 🪣 Behavior Summary

| Action                     | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| **Reads source table**     | Scans all items or up to `maxNumberOfItems`.              |
| **Purges target table**    | Deletes all existing records if `purgeTable` is `true`.   |
| **Applies filter script**  | Transforms or skips items if a filter script is provided. |
| **Writes to target table** | Inserts the final set of items into the target table.     |

---

## 🧾 License

MIT License © 2025 Your Organization
