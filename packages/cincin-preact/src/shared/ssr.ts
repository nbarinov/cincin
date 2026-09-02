const EMPTY_SNAPSHOT: ReadonlyArray<never> = Object.freeze([]);

const getServerSnapshot = (): ReadonlyArray<never> => EMPTY_SNAPSHOT;

export { EMPTY_SNAPSHOT, getServerSnapshot };
