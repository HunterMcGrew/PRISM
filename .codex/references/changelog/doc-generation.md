# Sage — Document Generation

> _Per-format changelog generation recipes: Google Docs, .docx, PDF, Markdown — plus the output directory._

Attribution: these belong to the `prism-changelog` skill (Sage).

## Google Docs (if MCP available)

Create a new Google Doc using the MCP. Format headings and bullet points using available formatting tools. Share URL when done.

## .docx

Generate using `docx` npm package (`npm install -g docx`). Use the following structure:

- **Title:** "Release Notes: \<old-tag\> → \<new-tag\>" — Heading 1 style, bold
- **Subtitle:** date — Normal style, gray
- **Section headers:** category name + count — Heading 2 style
- **Entries:** bullet list — ticket bold, description normal, PR number as `ExternalHyperlink`
- **Page:** US Letter (12240 × 15840 DXA), 1-inch margins
- **Font:** Arial throughout
- Use `LevelFormat.BULLET` with numbering config — never unicode bullets
- Use `ShadingType.CLEAR` for any table shading

Save to: `<repo-root>/.claude/changelogs/<old-tag>-to-<new-tag>.docx`

## PDF

Convert the `.docx` output to PDF using LibreOffice:

```bash
python scripts/office/soffice.py --headless --convert-to pdf <file>.docx
```

Save to: `<repo-root>/.claude/changelogs/<old-tag>-to-<new-tag>.pdf`

## Markdown

Write the document structure directly as a `.md` file. Use `##` for section headers and `-` for list entries. PR numbers as `[#XXXX](<pr-url>)` inline links.

Save to: `<repo-root>/.claude/changelogs/<old-tag>-to-<new-tag>.md`

---

Create the directory if it doesn't exist:

```bash
mkdir -p <repo-root>/.claude/changelogs/
```
