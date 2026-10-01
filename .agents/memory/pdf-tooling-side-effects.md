---
name: PDF tooling side effects
description: Temporary Python tooling setup in Node-focused workspaces can create unrelated project and environment files.
---

When installing one-off Python tools in a Node-focused workspace, check repository status before and after installation. Package setup may scaffold a Python project and alter workspace configuration; clean only changes created by the installation, and verify existing edits before restoring anything.

**Why:** Installing PyMuPDF for a visual PDF inspection initialized Python project scaffolding and added Nix configuration unrelated to the application.

**How to apply:** Prefer the package-management skill for installation, inspect the resulting diff, remove temporary inspection assets and scaffolding, restore only verified install-generated configuration changes, and restart the affected workflow.