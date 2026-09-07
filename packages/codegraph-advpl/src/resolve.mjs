const GLOBAL_KINDS = new Set(['user-function', 'function']);

export function resolveCallTarget(call, candidates = []) {
  const sameFileStatic = candidates.filter((candidate) => (
    candidate.file === call.file && candidate.kind === 'static-function'
  ));
  const globalCandidates = candidates.filter((candidate) => GLOBAL_KINDS.has(candidate.kind));
  const eligible = sameFileStatic.length > 0 ? sameFileStatic : globalCandidates;
  const target = eligible.length === 1 ? eligible[0] : null;

  return {
    target,
    resolution: target
      ? (sameFileStatic.length > 0 ? 'same-file-static' : 'global')
      : (eligible.length > 1 ? 'ambiguous' : 'unresolved'),
    candidateCount: eligible.length,
  };
}
