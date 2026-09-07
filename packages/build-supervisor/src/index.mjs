import { randomUUID } from 'node:crypto';

export function createBuildSupervisor(options) {
  if (typeof options?.runner !== 'function') throw new TypeError('runner is required');
  if (typeof options?.decideCapability !== 'function') {
    throw new TypeError('decideCapability is required');
  }

  return {
    async runPlan(plan, context = {}) {
      const environment = context.environment ?? 'development';
      const grants = context.grants ?? [];
      const run = {
        id: randomUUID(),
        status: 'running',
        environment,
        steps: [],
      };

      for (const step of plan.steps ?? []) {
        const decision = options.decideCapability(
          environment,
          step.capability ?? 'build:execute',
          { grants },
        );
        if (!decision.allowed) {
          run.steps.push({ id: step.id, status: 'blocked', decision });
          run.status = 'blocked';
          break;
        }
        try {
          const result = await options.runner(step, context);
          const status = result?.exitCode === 0 ? 'completed' : 'failed';
          run.steps.push({ id: step.id, status, result });
          if (status === 'failed') {
            run.status = 'failed';
            break;
          }
        } catch (error) {
          run.steps.push({
            id: step.id,
            status: 'failed',
            error: String(error?.message ?? error),
          });
          run.status = 'failed';
          break;
        }
      }
      if (run.status === 'running') run.status = 'completed';
      return run;
    },
  };
}
