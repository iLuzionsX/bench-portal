# Muse Spark delegated coding agent

This bridge delegates focused engineering work on the Onslaught zombie shooter to OpenCode Zen's `muse-spark-1.3-contributor-free` model while keeping GPT-5.6 Sol as the lead engineer and integration gate.

## Safety model

- Muse receives a bounded text snapshot of `games/onslaught-fable-5.1/source-reconstruction/**`, the shipped game metadata/index, and `scripts/smoke-onslaught.mjs`.
- Environment files, credentials, private keys, repository metadata, dependencies, build output, and unrelated games are excluded.
- Muse can only **propose** a unified diff. The runner never applies, commits, merges, pushes, or deploys it.
- Proposed patch paths are validated against a literal allowlist before the result is accepted.
- Results are saved under `.muse/artifacts/` for lead-engineer review.
- Muse is instructed not to claim that tests were executed; it instead returns tests for the lead engineer to run.

## Privacy note

The OpenCode Zen Contributor Free tier may allow prompts and completions to be used for model training. Use this bridge only with public/non-confidential repository content. The runner intentionally excludes common secret and environment-file paths.

## Setup

1. Sign in to OpenCode Zen and create an API key.
2. Keep the key out of the repository and expose it only to the process running the agent:

```bash
export OPENCODE_ZEN_API_KEY='your-key-here'
```

The endpoint and model are intentionally pinned in `zen.mjs`:

- endpoint: `https://opencode.ai/zen/v1/responses`
- model: `muse-spark-1.3-contributor-free`

Pinning prevents an accidental switch from the free contributor model to a paid model.

## Run

```bash
npm run agent:muse -- --task "Improve mobile shooting controls without changing desktop feel"
```

Or put a longer assignment in a repository-local text file:

```bash
npm run agent:muse -- --task-file tasks/mobile-controls.txt
```

Inspect the exact context without making an API request:

```bash
npm run agent:muse:dry -- --task "Review horde performance"
```

Run the local guardrail/parser tests:

```bash
npm run test:muse-agent
```

## Result contract

Muse must return one JSON object with:

- `summary`
- `findings`
- `files_inspected`
- `files_proposed_for_change`
- `patch`
- `tests_to_run`
- `risks`
- `assumptions`
- `unresolved_issues`

`patch` is either `null` or a unified diff. Even a valid diff remains advisory until the lead engineer reviews and applies it separately.
