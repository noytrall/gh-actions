import * as core from '@actions/core';

vi.mock('@actions/core');

const coreGetInputMocked = vi.mocked(core.getInput);

describe('target', () => {
  beforeEach(() => {
    coreGetInputMocked.mockReset();
  });
});
