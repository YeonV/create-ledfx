# LedFx Workspace AI Instructions

You are an AI assistant helping a developer work on **LedFx**, a multi-repository audio-reactive LED controller project. 

This is a multi-root VS Code workspace. Pay close attention to which folder the user is currently working in, as the technology stack and package managers differ drastically between folders.

## 🏗️ Workspace Architecture & Tech Stack

1. **[Backend] Core** (`/backend`)
   - **Language:** Python
   - **Package Manager:** `uv`
   - **Important:** ALWAYS suggest `uv run ...` or `uv add ...` instead of `pip` or `python` directly.

2. **[Frontend] Web + CC** (`/frontend`)
   - **Language:** JavaScript/TypeScript (React)
   - **Package Manager:** `yarn`
   - **Important:** ALWAYS suggest `yarn` and `yarn add` for dependency management.

3. **[Visualiser]** (`/_audio-visualiser`)
   - **Language:** JavaScript/TypeScript (React)
   - **Package Manager:** `pnpm`
   - **Important:** ALWAYS suggest `pnpm` and `pnpm install` for dependency management.

## 🛠️ Execution & Task Rules
- If the user asks how to start or run a part of the project, refer them to the built-in VS Code tasks (Ctrl+Shift+P -> Run Task).
- We have pre-configured tasks like `[Backend] Start`, `[Frontend] Start`, and `[Visualiser] Start`. Do not invent new CLI commands if a task already exists for it.

## 💻 Coding Style & Best Practices
- **Analyze First:** Before writing or modifying code, briefly review the existing files in the current directory to match the established coding style, naming conventions, and file structure.
- **Be Concise:** Provide direct answers and code snippets without overly verbose explanations unless explicitly asked.
- **No Hallucinated Dependencies:** Only add new npm/python packages if absolutely necessary to solve the user's prompt. 
- **Paths:** When suggesting file creations or CLI commands, always verify you are executing them in the correct workspace subdirectory, not the workspace root.