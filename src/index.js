/**
 * JMart Steel Safety App - Module Exports
 *
 * This file exports all testable modules extracted from the main application.
 * These modules can be imported for unit testing and can eventually be used
 * to refactor the monolithic index.html into a proper build system.
 */

// Validation
export * from './validation/formValidation';

// Services
export { createFirebaseSync } from './services/firebaseSync';
export { createStorageService, STORAGE_KEYS } from './services/storage';
export { createGoogleDriveSync } from './services/googleDrive';

// Utilities
export * from './utils/signature';
