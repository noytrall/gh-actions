export default {
  '**/*.ts': ['npm run lint:fix'],
  '*.{md,yaml,yml,json}': ['npm run prettier:fix'],
};
