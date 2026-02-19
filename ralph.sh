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

if ! [[ "$MAX_ITERATIONS" =~ ^[0-9]+$ ]]; then
    echo "Usage: ./ralph.sh [max_iterations] [--verbose]"
    exit 1
fi
ITERATION=0
PLAN_FILE=".ralph-plan.md"
PROGRESS_FILE=".ralph-progress.md"
LOG_FILE=".ralph-loop.log"
OUTPUT_FILE=""
RATE_LIMIT_COUNT=0

cleanup() {
    [ -n "$OUTPUT_FILE" ] && [ -f "$OUTPUT_FILE" ] && rm -f "$OUTPUT_FILE"
}
trap cleanup EXIT INT TERM

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
    error "Missing AGENTS.md — required for Claude Code sessions"
    exit 1
fi

# Git state pre-checks
CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
    error "Not on any branch (detached HEAD). Fix before running."
    exit 1
fi

if git status --porcelain | grep -q "^UU\|^AA\|^DD"; then
    error "Unresolved merge conflicts. Run 'git merge --continue' or 'git merge --abort' first."
    exit 1
fi

if [ -f ".git/MERGE_HEAD" ]; then
    error "Git is in MERGING state. Finalize merge before running Ralph loop."
    exit 1
fi

if ! git config user.name > /dev/null 2>&1 || ! git config user.email > /dev/null 2>&1; then
    error "Git identity not set. Run: git config user.name 'Name' && git config user.email 'email@example.com'"
    exit 1
fi

if ! command -v claude &>/dev/null; then
    error "Claude Code CLI not found. Install: https://docs.anthropic.com/claude-code"
    exit 1
fi

# Circuit breaker state
LAST_COMMIT=$(git rev-parse HEAD)
NO_PROGRESS_COUNT=0
NO_PROGRESS_THRESHOLD=3

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
log "Branch: $CURRENT_BRANCH"
log "Max iterations: $MAX_ITERATIONS"
log "Pending: $(count_pending) | Done: $(count_done) | Blocked: $(count_blocked)"
log "=========================================="

while [ "$ITERATION" -lt "$MAX_ITERATIONS" ]; do
    ITERATION=$((ITERATION + 1))
    PENDING=$(count_pending)
    IN_PROGRESS=$(count_in_progress)
    DONE=$(count_done)
    BLOCKED=$(count_blocked)

    if [ ! -r "$PLAN_FILE" ]; then
        error "Plan file $PLAN_FILE is not readable. Aborting."
        exit 1
    fi

    log "--- Iteration $ITERATION / $MAX_ITERATIONS ---"
    log "Status: Pending=$PENDING In-Progress=$IN_PROGRESS Done=$DONE Blocked=$BLOCKED"

    # Check completion conditions
    if [ "$PENDING" -eq 0 ] && [ "$IN_PROGRESS" -eq 0 ]; then
        if [ "$BLOCKED" -gt 0 ]; then
            warn "All remaining stories are blocked ($BLOCKED). Check $PROGRESS_FILE"
            exit 1
        fi
        success "All stories complete! ($DONE done)"
        exit 0
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

    # Log output if verbose
    if [ "$VERBOSE" = "--verbose" ]; then
        echo "$OUTPUT" >> "$LOG_FILE"
    fi

    # Check for completion signals in output (elif chain — only first match matters)
    if echo "$OUTPUT" | grep -q "RALPH_BMAD_COMPLETE"; then
        success "RALPH_BMAD_COMPLETE — All stories implemented!"
        exit 0
    elif echo "$OUTPUT" | grep -q "RALPH_BMAD_BLOCKED"; then
        warn "RALPH_BMAD_BLOCKED — All remaining stories blocked"
        exit 1
    elif echo "$OUTPUT" | grep -q "SPRINT_PLANNING_NEEDED"; then
        error "Sprint planning must run first. Run /bmad:bmm:workflows:sprint-planning"
        exit 1
    elif echo "$OUTPUT" | grep -q "STORY_COMPLETE"; then
        success "Story completed. Fresh context for next story..."
        RATE_LIMIT_COUNT=0
    elif echo "$OUTPUT" | grep -q "STORY_BLOCKED"; then
        warn "Story blocked with WIP commit. Check .ralph-progress.md for details."
        RATE_LIMIT_COUNT=0
    elif echo "$OUTPUT" | grep -q "SESSION_CHECKPOINT"; then
        warn "Session checkpoint — context limit approaching. Fresh context..."
        NO_PROGRESS_COUNT=0  # Checkpoints are intentional, not stalls
        RATE_LIMIT_COUNT=0
    fi

    # Rate limit detection (check last 50 lines, use specific patterns, cap retries)
    TAIL_OUTPUT=$(echo "$OUTPUT" | tail -50)
    if echo "$TAIL_OUTPUT" | grep -qi "rate limit exceeded\|HTTP 429\|usage limit reached\|too many requests"; then
        RATE_LIMIT_COUNT=$((RATE_LIMIT_COUNT + 1))
        if [ "$RATE_LIMIT_COUNT" -ge 5 ]; then
            error "Rate limited 5 times consecutively. Aborting."
            exit 1
        fi
        warn "Rate limit detected ($RATE_LIMIT_COUNT/5) at iteration $ITERATION. Waiting 5 minutes..."
        sleep 300
        ITERATION=$((ITERATION - 1))  # Don't count this iteration
        continue
    fi

    # Circuit breaker: detect no-commit stalls
    CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null) || {
        error "Failed to read git commit. Repository may be corrupted."
        break
    }
    if [ "$CURRENT_COMMIT" = "$LAST_COMMIT" ]; then
        NO_PROGRESS_COUNT=$((NO_PROGRESS_COUNT + 1))
        warn "No new commit. Stall count: $NO_PROGRESS_COUNT/$NO_PROGRESS_THRESHOLD"
        if [ "$NO_PROGRESS_COUNT" -ge "$NO_PROGRESS_THRESHOLD" ]; then
            error "Circuit breaker: $NO_PROGRESS_THRESHOLD iterations with no commits. Stopping."
            break
        fi
    else
        NO_PROGRESS_COUNT=0
        RATE_LIMIT_COUNT=0
        LAST_COMMIT="$CURRENT_COMMIT"
    fi

    # Fallback push after each iteration (best-effort)
    PUSH_OUTPUT=$(git push origin "$CURRENT_BRANCH" 2>&1) || {
        warn "Git push failed (non-fatal): $PUSH_OUTPUT"
    }

    # Adaptive pause (3s normal, 10s if stalling)
    if [ "$NO_PROGRESS_COUNT" -gt 0 ]; then
        log "Pausing 10s (stall detected)..."
        sleep 10
    else
        log "Pausing 3s before next iteration..."
        sleep 3
    fi
done

warn "Reached max iterations ($MAX_ITERATIONS). $(count_pending) stories still pending."
exit 1
