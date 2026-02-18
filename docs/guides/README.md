# AI Tool Guides for TrailblazeAi

Developer guides for working with the TrailblazeAi project using different AI coding assistants.

## Available Guides

| Guide | Tool | Best For |
|-------|------|----------|
| [Claude Code CLI](./claude-code-cli.md) | Claude Code (Terminal) | Full development workflow, BMAD V6 integration, MCP servers |
| [Claude on Web](./claude-web.md) | claude.ai | Planning, architecture review, document generation, prototyping |
| [OpenAI Codex](./openai-codex.md) | Codex (codex.openai.com) | Autonomous task execution, sandboxed development |
| [Google Gemini](./google-gemini.md) | Gemini CLI | Alternative CLI development, BMAD commands |
| [GitHub Copilot](./github-copilot.md) | Copilot (VS Code / GitHub) | Code completion, in-editor assistance, PR reviews |

## Configuration Files

Each tool has its own configuration directory:

- **Claude Code:** `.claude/` (mcp.json, settings.json, commands/, skills/)
- **GitHub Actions:** `.github/workflows/claude-code.yml` (automated PR review with Haiku)
- **GitHub Copilot:** `.github/copilot/instructions.md`, `.github/agents/`
- **OpenAI Codex:** `.agent/instructions.md`, `.agent/workflows/bmad/`
- **Google Gemini:** `.gemini/settings.json`, `.gemini/GEMINI.md`, `.gemini/commands/`

## BMAD V6 Integration

All tools have access to BMAD V6 workflows through their respective command systems. The BMAD framework provides structured development workflows including:

- Product briefs and PRDs
- Architecture design
- Epic and story creation
- Sprint planning and execution
- Code review (adversarial)
- Test architecture

See individual guides for tool-specific BMAD integration details.
