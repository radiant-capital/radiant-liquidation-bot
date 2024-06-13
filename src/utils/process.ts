export function listenForUnhandledRejection(listener: (error: Error) => void) {
  process.on('unhandledRejection', listener);
}
