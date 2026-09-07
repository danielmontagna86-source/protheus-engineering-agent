const KNOWN_INTEGRATIONS = Object.freeze(['dictionary', 'oracle', 'tdn']);

export function createIntegrationRegistry(adapters = {}) {
  const configured = new Map(
    Object.entries(adapters).filter(([name, adapter]) =>
      KNOWN_INTEGRATIONS.includes(name) && typeof adapter?.invoke === 'function'),
  );

  return {
    status() {
      return KNOWN_INTEGRATIONS.map((name) => ({ name, available: configured.has(name) }));
    },
    async invoke(name, operation, args) {
      const adapter = configured.get(name);
      if (!adapter) {
        return {
          ok: false,
          error: { code: 'INTEGRATION_UNAVAILABLE', integration: name },
        };
      }
      try {
        return await adapter.invoke(operation, args);
      } catch (error) {
        return {
          ok: false,
          error: {
            code: 'INTEGRATION_FAILED',
            integration: name,
            message: String(error?.message ?? error),
          },
        };
      }
    },
  };
}
