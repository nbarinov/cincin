#!/usr/bin/env bash
# Posts (or refreshes) the pull request comment that links every example
# app to StackBlitz, pinned to the pull request's head commit.
#
# Runs from the base branch under pull_request_target: it reads the head
# repository and sha out of the event payload and never checks out or
# executes the contributor's code. Both values are validated below all
# the same, since they end up inside a URL in a comment body.
set -euo pipefail

: "${HEAD_REPO:?}" "${HEAD_SHA:?}" "${REPO:?}" "${PR:?}"

if [[ ! "$HEAD_REPO" =~ ^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$ ]]; then
  echo "refusing to link an unexpected head repository: $HEAD_REPO" >&2
  exit 1
fi

if [[ ! "$HEAD_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "refusing to link an unexpected head sha: $HEAD_SHA" >&2
  exit 1
fi

MARKER='<!-- stackblitz-links -->'
TREE="https://stackblitz.com/github/${HEAD_REPO}/tree/${HEAD_SHA}"

rows=''
while IFS='|' read -r app script; do
  [[ -n "$app" ]] || continue
  rows+="| \`examples/${app}\` | [Open ↗](${TREE}?startScript=${script}) |"$'\n'
done <<'APPS'
react|dev:react
vue|dev:vue
solid|dev:solid
preact|dev:preact
vanilla|dev:vanilla
framer-motion|dev:motion
radix|dev:radix
APPS

body="${MARKER}
**Try this branch in the browser.** Each link boots the workspace at
\`${HEAD_SHA:0:7}\` in StackBlitz and starts that example against the
branch's sources — no clone, no install.

| App | |
| --- | --- |
${rows}
_Refreshed on every push._"

if [[ -n "${STACKBLITZ_COMMENT_DRY_RUN:-}" ]]; then
  printf '%s\n' "$body"
  exit 0
fi

: "${GH_TOKEN:?}"
api="https://api.github.com/repos/${REPO}"
auth=(
  -H "authorization: Bearer ${GH_TOKEN}"
  -H 'accept: application/vnd.github+json'
  -H 'content-type: application/json'
)

# One comment per pull request: find the previous one by its marker.
comment_id=$(
  curl -fsS "${auth[@]}" "${api}/issues/${PR}/comments?per_page=100" |
    jq -r --arg marker "$MARKER" \
      '[.[] | select(.body | startswith($marker))] | last | .id // empty'
)

payload=$(jq -n --arg body "$body" '{body: $body}')

if [[ -n "$comment_id" ]]; then
  curl -fsS -X PATCH "${auth[@]}" -d "$payload" \
    "${api}/issues/comments/${comment_id}" >/dev/null
  echo "refreshed comment ${comment_id}"
else
  curl -fsS -X POST "${auth[@]}" -d "$payload" \
    "${api}/issues/${PR}/comments" >/dev/null
  echo "posted a new comment"
fi
