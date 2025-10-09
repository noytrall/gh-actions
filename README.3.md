# 🪣 AWS Cross-Account Data Sync Action

This GitHub Action automates **data synchronization between AWS accounts**, supporting both **DynamoDB** and **S3** as sources and targets.

It allows you to:

- Copy data **from DynamoDB to DynamoDB**, **S3 to S3**, or **between DynamoDB and S3**
- Run the **entire sync process** in one step, or
- Split the process into **two stages** (extract + load) if you want to manipulate the data in between — for example, removing PII or transforming records.

---

## 📦 Configuration

The action receives a path to a JSON config file with the following TypeScript shape:

```ts
type Config = {
  source:
    | {
        type: "dynamo";
        dynamoTableName: string;
      }
    | {
        type: "s3";
        /**
         * s3Config accepts all parameters supported by
         * AWS SDK's `GetObjectCommandInput`.
         * Only Bucket and Key are required.
         */
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
        /**
         * s3Config accepts all parameters supported by
         * AWS SDK's `PutObjectCommandInput`.
         * Only Bucket and Key are required.
         */
        s3Config: {
          [x: string]: unknown;
          Bucket: string;
          Key: string;
        };
      };
};
```
