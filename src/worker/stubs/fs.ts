// Stub for fs/promises module - not used in Worker
export const writeFile = () => { throw new Error('fs not available in Worker'); };
export const access = () => { throw new Error('fs not available in Worker'); };
export const mkdir = () => { throw new Error('fs not available in Worker'); };
