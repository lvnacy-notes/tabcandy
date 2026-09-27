All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Release [1.3.0] - 2026-09-27

- Added commands to close duplicate tabs, close every tab except the current one, and close every tab in a chosen folder (optionally including its subfolders) — none of these ever close a pinned tab
- Added a "Reopen closed tab" command, and an optional "Recently closed tabs" list on the new tab screen
- Added a "Search open tabs" command for fuzzy-jumping straight to any currently open tab
- Added commands to cycle to the next/previous tab across every tab group, not just the current one
- Added a "Widen stacked tab panes" setting, with an optional Style Settings slider for picking an exact width
- Added a setting to switch to a note's existing tab instead of opening a duplicate, when clicking it from Recent Files, Bookmarks, or Recently closed tabs
- Cleaned up latent ESLint disable directives in test files
- Updated ESLint config to block disable directives project-wide

## Release [1.2.0] - 2026-09-17

- Split the Settings into two categories, organizing all options within them
- Added Style Settings support for customizing specific colors
- Added overlay contrast feature
- This release introduces scaffolding for future feature development. See the Roadmap for details.

## Release [1.1.0] - 2026-09-08

- Quotes can be added via an in-vault markdown document
- Custom quotes can now be exported to and imported from a markdown document

## Release [1.0.0] - 2026-09-06

- Complete refactor and rebranding of Beautitab
- Brought codebase to current API
- Mobile and Desktop now supported
- Declarative API integrated
- Testing Specification established with a generated Test Suite