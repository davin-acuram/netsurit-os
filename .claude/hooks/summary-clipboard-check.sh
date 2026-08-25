#!/bin/bash
# Stop hook: require a fresh clipboard-summary marker before letting Claude
# stop. If the marker is missing or stale, block the stop and tell Claude to
# summarize the run, pbcopy it, and touch the marker.
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
marker="$script_dir/.last-summary-marker"
now=$(date +%s)
mtime=0
if [ -f "$marker" ]; then
  mtime=$(stat -f %m "$marker" 2>/dev/null || stat -c %Y "$marker" 2>/dev/null || echo 0)
fi
age=$(( now - mtime ))

if [ "$age" -lt 30 ]; then
  echo "{}"
else
  reason="Before stopping: write a short bullet-point summary of what happened this run, copy it to the clipboard with pbcopy, then run: touch $marker -- then you may stop."
  jq -n --arg reason "$reason" '{decision: "block", reason: $reason}'
fi
