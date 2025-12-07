# Change: Add Jekyll Front Matter and Update Export Target

## Why
Currently, exported markdown files lack the front matter metadata required by Jekyll static site generators, and the GitHub Actions workflow pushes to a general repository without proper Jekyll blog structure. To enable seamless integration with Jekyll-based blogs, we need to add Jekyll-compatible front matter and update the workflow to push to the correct Jekyll `_posts` directory with proper naming conventions.

## What Changes
- **Markdown Export Format**:
  - Add Jekyll front matter block at the top of exported markdown files
  - Front matter includes three fields: `layout: post`, `title: HackerNews Daily - YYYY-MM-DD`, and `date: YYYY-MM-DD`
  - Front matter enclosed in YAML delimiters (`---`)
  - Change filename format from `hackernews-YYYY-MM-DD.md` to `YYYY-MM-DD-daily.md` (Jekyll convention with daily suffix)
  - Change local export folder from `TLDR-HackNews24` to `hacknews-export`
  
- **GitHub Actions Workflow**:
  - Update target repository from `KrabsWong/TLDR-HackNews24` to `git@github.com:KrabsWong/tldr-hacknews-24.git`
  - Change destination directory from repository root to `_posts/` directory
  - Update filename reference to use new naming format (`YYYY-MM-DD-daily.md`)

## Impact
- Affected specs: `daily-export`, `github-actions-workflow`
- Affected code:
  - `src/services/markdownExporter.ts` (add front matter generation, update filename format)
  - `.github/workflows/daily-export.yml` (update repository URL and destination path)
- Breaking changes: None - this is a backward-compatible enhancement (local exports still work)
- User benefit: Exported markdown files can be used directly with Jekyll blogs without manual editing
