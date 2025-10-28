import z from 'zod';

export interface AWSConfig {
  accessKeyId: string;
  region: string;
  secretAccessKey: string;
  sessionToken: string;
}

export const configSchema = z.object({
  source: z.object({
    dynamoTableName: z.string().nonoptional(),
  }),
  target: z.object({
    dynamoTableName: z.string().nonoptional(),
    purgeTable: z.boolean().optional().default(false),
  }),
  maxNumberOfItems: z.number().optional(),
});

export type Config = z.infer<typeof configSchema>;
