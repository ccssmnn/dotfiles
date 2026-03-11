# ccssmnn - .dotfiles

## Quick Setup

```bash
# clone repo
git clone https://github.com/ccssmnn/dotfiles ~/Projects/dotfiles
cd ~/Projects/dotfiles

# run automated install
./install.sh
```

## Manual Setup

### Homebrew

Install [Homebrew](https://brew.sh)

```bash
brew install --cask ghostty

brew install \
  starship \
  gh \
  helix \
  lazygit \
  lazydocker \
  zoxide \
  fzf \
  git-delta \
  marksman \
  xplr 
```

### NodeJS

Install [fnm](https://github.com/Schniz/fnm?tab=readme-ov-file#installation)

```bash
# use pnpm
corepack enable pnpm

# install tooling for developing in nodejs
pnpm add -g \
  @ccssmnn/md-ai \
  typescript \
  prettier \
  prettier-plugin-tailwindcss \
  prettier-plugin-astro \
  typescript-language-server \
  @prisma/language-server \
  @tailwindcss/language-server \
  @astrojs/language-server \
  vscode-langservers-extracted

# link custom scripts globally
cd ~/Projects/dotfiles/scripts
pnpm install
pnpm link --global
```

### Fonts

I'm using Geist Mono Nerd Font. [Download here](https://www.nerdfonts.com/font-downloads)

### Secrets

`./install.sh` now prompts for required secrets declared in `agents/secrets.required` and stores them in:

- `~/.config/secrets/env` (chmod `600`)

Your `~/.zshrc` sources this file automatically.

## What Gets Symlinked

- `~/.zshrc` → `zsh/.zshrc`
- `~/.zshenv` → `zsh/.zshenv`
- `~/.gitconfig` → `git/.gitconfig`
- `~/.gitignore_global` → `git/.gitignore_global`
- `~/.aerospace.toml` → `aerospace/aerospace.toml`
- `~/.config/helix/` → `helix/`
- `~/.config/ghostty/config` → `ghostty/config`
- `~/.config/xplr/` → `xplr/`
- `~/.config/md-ai/config.json` → `md-ai/config.json`
- `~/.config/md-ai/SYSTEM.md` → `md-ai/SYSTEM.md`
- `~/.config/opencode/opencode.json` → `opencode/opencode.json`
- `~/.config/opencode/AGENTS.md` → `agents/AGENTS.md`
- `~/.config/opencode/skills` → `agents/skills`
- `~/.claude/CLAUDE.md` → `agents/AGENTS.md`
- `~/.claude/skills` → `agents/skills`
- `~/.codex/AGENTS.md` → `agents/AGENTS.md`
- `~/.codex/skills` → `agents/skills`
- `~/.config/pi/AGENTS.md` → `agents/AGENTS.md`
- `~/.config/pi/skills` → `agents/skills`
- `~/.pi/agent/extensions` → `agents/pi/extensions`
