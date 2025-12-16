Follow the workflow defined in `.github/prompts/breakdown-feature.prompt.md`.

This command breaks down a feature into implementation tasks. It will:
- Analyze feature requirements
- Identify affected layers (DB/backend/frontend)
- Create task files for each component
- Sequence tasks with dependencies
- Update feature file with task list
- Update ROADMAP.md with priorities

**Usage**: Specify which feature to break down, or it will use the current context.

**See**: `.github/prompts/breakdown-feature.prompt.md` for complete workflow details.

