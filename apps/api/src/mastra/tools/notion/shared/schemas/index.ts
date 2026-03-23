// Common schemas
export { notionId, paginationParams, richTextInput, emoji } from './common';

// Search tool schemas
export {
  searchPagesInputSchema,
  getPageInputSchema,
  getBlockChildrenInputSchema,
  getBlockInputSchema,
  getDatabaseInputSchema,
  getCommentsInputSchema,
} from './search';

// Write tool schemas
export {
  createPageInputSchema,
  updatePageInputSchema,
  appendBlocksInputSchema,
  updateBlockInputSchema,
  deleteBlockInputSchema,
  archivePageInputSchema,
  createCommentInputSchema,
} from './write';

// Database tool schemas
export {
  queryDatabaseInputSchema,
  createDatabaseInputSchema,
  updateDatabaseInputSchema,
  createDataSourceInputSchema,
} from './database';
