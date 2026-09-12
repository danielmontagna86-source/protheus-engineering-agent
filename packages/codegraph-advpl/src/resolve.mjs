const GLOBAL_KINDS = new Set(['user-function', 'function']);

export function eligibleCallTargets(call, candidates = []) {
  const sameFileStatic = candidates.filter((candidate) => (
    candidate.file === call.file && candidate.kind === 'static-function'
  ));
  return sameFileStatic.length > 0
    ? sameFileStatic
    : candidates.filter((candidate) => GLOBAL_KINDS.has(candidate.kind));
}

export function resolveCallTarget(call, candidates = []) {
  const eligible = eligibleCallTargets(call, candidates);
  const hasSameFileStatic = eligible.some((candidate) => (
    candidate.file === call.file && candidate.kind === 'static-function'
  ));
  const target = eligible.length === 1 ? eligible[0] : null;

  return {
    target,
    resolution: target
      ? (hasSameFileStatic ? 'same-file-static' : 'global')
      : (eligible.length > 1 ? 'ambiguous' : 'unresolved'),
    candidateCount: eligible.length,
  };
}
