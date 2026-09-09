# Large-repository performance evidence — 2026-09-09

Environment: Windows x64, Node.js 22.23.2. Synthetic Apache-2.0 fixtures; no customer source. The CI profile was also observed on GitHub Windows/Linux, Node.js 22/24, with a maximum 38.8 ms cold, 12.7 ms warm, 11.4 ms changed and 12.4 MiB sampled RSS at 1,000 symbols.

| Profile | Symbols | Files | Cold | Warm | One-file change | Sampled peak RSS delta | Result |
|---|---:|---:|---:|---:|---:|---:|---|
| ci-1000 | 1,000 | 10 | 26.2 ms | 6.7 ms | 6.9 ms | 3.4 MiB | PASS |
| release-1000 | 1,000 | 10 | 22.2 ms | 6.7 ms | 6.7 ms | 3.1 MiB | PASS |
| release-10000 | 10,000 | 100 | 97.6 ms | 58.1 ms | 60.3 ms | 19.6 MiB | PASS |

The cold and warm normalized graphs had the same SHA-256. Every warm run reused all files; every changed run invalidated exactly one. The CI thresholds are now 500/250/250 ms and 64 MiB; the 10,000-symbol release thresholds are 2,000/1,000/2,000 ms and 128 MiB. They retain material scheduler variance while rejecting the previous orders-of-magnitude regression headroom. Run `npm run benchmark:large` for CI scope and `npm run benchmark:large:release` for 1,000/10,000 symbols. Values above are rounded from the fresh local run and are evidence for this worktree state, not the final release commit.

Memory is the highest RSS delta observed by a 1 ms Node.js sampler during each operation; it is not an operating-system-enforced hard cap. These are local synthetic budgets, not a productivity claim. Linux and the exact release candidate must generate fresh evidence before stable promotion.
