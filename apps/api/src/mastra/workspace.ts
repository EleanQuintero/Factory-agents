import { Workspace, LocalFilesystem } from '@mastra/core/workspace';
import { resolve } from 'node:path';

export const workspace = new Workspace({
  name: 'factory-agents',
  filesystem: new LocalFilesystem({ basePath: resolve(import.meta.dirname, '../../skills') }),
  skills: ['notion-api', 'composio-search'],
});
