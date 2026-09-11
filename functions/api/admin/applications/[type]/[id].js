import { manageApplication } from '../../../../_lib/application-management.js';
export function onRequest(context) { return manageApplication(context, true); }
