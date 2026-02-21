// Must be loaded before PrismJS to prevent its internal worker message handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Prism = { manual: true, disableWorkerMessageHandler: true };
