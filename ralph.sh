#!/bin/bash
# Ralph-BMAD Loop — Fresh context per story iteration
# Spawns a fresh Claude Code CLI session for each story to prevent context degradation.
#
# Usage:
#   ./ralph.sh              # Run with default 20 max iterations
#   ./ralph.sh 10           # Run with 10 max iterations
#   ./ralph.sh 5 --verbose  # Run with verbose output
#
# Prerequisites:
#   - Claude Code CLI installed and authenticated
#   - .ralph-plan.md exists at project root
#   - AGENTS.md exists at project root
#   - .ralph-progress.md exists at project root

set -euo pipefail

MAX_ITERATIONS=${1:-20}
VERBOSE=${2:-""}
ITERATION=0
PLAN_FILE=".ralph-plan.md"
PROGRESS_FILE=".ralph-progress.md"
LOG_FILE=".ralph-loop.log"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[$timestamp]${NC} $1"
    echo "[$timestamp] $1" >> "$LOG_FILE"
}

error() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[$timestamp] ERROR:${NC} $1"
    echo "[$timestamp] ERROR: $1" >> "$LOG_FILE"
}

success() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$timestamp]${NC} $1"
    echo "[$timestamp] $1" >> "$LOG_FILE"
}

warn() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[$timestamp]${NC} $1"
    echo "[$timestamp] $1" >> "$LOG_FILE"
}

# Verify prerequisites
if [ ! -f "$PLAN_FILE" ]; then
    error "Missing $PLAN_FILE — run /ralph-bridge first"
    exit 1
fi

if [ ! -f "$PROGRESS_FILE" ]; then
    error "Missing $PROGRESS_FILE — create it before running the loop"
    exit 1
fi

if [ ! -f "AGENTS.md" ]; then
    warn "Missing AGENTS.md — creating minimal version"
    echo "# AGENTS.md — Operational Knowledge" > AGENTS.md
    echo "" >> AGENTS.md
    echo "## Build Commands" >> AGENTS.md
    echo "- pnpm test" >> AGENTS.md
    echo "- pnpm type-check" >> AGENTS.md
    echo "- pnpm build" >> AGENTS.md
fi

# Check for pending stories
count_pending() {
    grep -c '^\- \[ \]' "$PLAN_FILE" 2>/dev/null || echo "0"
}

count_done() {
    grep -c '^\- \[x\]' "$PLAN_FILE" 2>/dev/null || echo "0"
}

count_blocked() {
    grep -c '^\- \[!\]' "$PLAN_FILE" 2>/dev/null || echo "0"
}

count_in_progress() {
    grep -c '^\- \[~\]' "$PLAN_FILE" 2>/dev/null || echo "0"
}

log "=========================================="
log "Ralph-BMAD Loop Starting"
log "Max iterations: $MAX_ITERATIONS"
log "Pending: $(count_pending) | Done: $(count_done) | Blocked: $(count_blocked)"
log "=========================================="

while [ "$ITERATION" -lt "$MAX_ITERATIONS" ]; do
    ITERATION=$((ITERATION + 1))
    PENDING=$(count_pending)
    IN_PROGRESS=$(count_in_progress)
    DONE=$(count_done)
    BLOCKED=$(count_blocked)

    log "--- Iteration $ITERATION / $MAX_ITERATIONS ---"
    log "Status: Pending=$PENDING In-Progress=$IN_PROGRESS Done=$DONE Blocked=$BLOCKED"

    # Check completion conditions
    if [ "$PENDING" -eq 0 ] && [ "$IN_PROGRESS" -eq 0 ]; then
        success "All stories complete! ($DONE done, $BLOCKED blocked)"
        exit 0
    fi

    if [ "$PENDING" -eq 0 ] && [ "$IN_PROGRESS" -eq 0 ] && [ "$BLOCKED" -gt 0 ]; then
        warn "All remaining stories are blocked ($BLOCKED). Check $PROGRESS_FILE"
        exit 1
    fi

    # Run Claude Code with fresh context
    log "Spawning fresh Claude Code session..."

    # Create a temporary file for output capture
    OUTPUT_FILE=$(mktemp)

    # Run claude with the ralph-run skill
    # --dangerously-skip-permissions: allow autonomous execution
    # --print: output to stdout (captured)
    if claude --dangerously-skip-permissions --print "/ralph-run" > "$OUTPUT_FILE" 2>&1; then
        log "Claude Code session completed successfully"
    else
        warn "Claude Code session exited with non-zero status"
    fi

    # Read the output
    OUTPUT=$(cat "$OUTPUT_FILE")
    rm -f "$OUTPUT_FILE"

    # Log output if verbose
    if [ "$VERBOSE" = "--verbose" ]; then
        echo "$OUTPUT" >> "$LOG_FILE"
    fi

    # Check for completion signals in output
    if echo "$OUTPUT" | grep -q "RALPH_BMAD_COMPLETE"; then
        success "RALPH_BMAD_COMPLETE — All stories implemented!"
        exit 0
    fi

    if echo "$OUTPUT" | grep -q "RALPH_BMAD_BLOCKED"; then
        warn "RALPH_BMAD_BLOCKED — All remaining stories blocked"
        exit 1
    fi

    if echo "$OUTPUT" | grep -q "STORY_COMPLETE"; then
        success "Story completed. Fresh context for next story..."
    fi

    if echo "$OUTPUT" | grep -q "SESSION_CHECKPOINT"; then
        warn "Session checkpoint — context limit approaching. Fresh context..."
    fi

    if echo "$OUTPUT" | grep -q "SPRINT_PLANNING_NEEDED"; then
        error "Sprint planning must run first. Run /bmad:bmm:workflows:sprint-planning"
        exit 1
    fi

    # Brief pause between iterations (let git settle, avoid rate limits)
    log "Pausing 3s before next iteration..."
    sleep 3
done

warn "Reached max iterations ($MAX_ITERATIONS). $PENDING stories still pending."
exit 1
