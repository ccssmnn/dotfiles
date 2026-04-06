# ccssmnn - .dotfiles

## Quick Setup

```bash
# clone repo
git clone https://github.com/ccssmnn/dotfiles ~/Developer/dotfiles
cd ~/Developer/dotfiles

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
  tmux \
  git-delta \
  marksman \
  xplr \
  uv \
  deno 
```

### NodeJS & Bun

```bash
bun add -g \
  typescript \
  prettier \
  prettier-plugin-tailwindcss \
  prettier-plugin-astro \
  typescript-language-server \
  @prisma/language-server \
  @tailwindcss/language-server \
  @astrojs/language-server \
  vscode-langservers-extracted \
  opencode-ai \
  @mariozechner/pi-coding-agent
```

### Fonts

I'm using Geist Mono Nerd Font. [Download here](https://www.nerdfonts.com/font-downloads)

### Tmux workflow

- Ghostty shells auto-attach to tmux by default
- `tj` opens an fzf/zoxide-powered project picker and attaches/creates a session for that project
- `tj .` attaches/creates a session for the current git repo
- Inside tmux: `Ctrl-g c` opens a new window, `Ctrl-g s` opens the chooser, `Ctrl-g ,` / `Ctrl-g .` switches windows

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
- `~/.config/tmux/tmux.conf` → `tmux/.config/tmux/tmux.conf`
- `~/.config/tmux/themes` → `tmux/.config/tmux/themes`
- `~/.config/xplr/` → `xplr/`
- `~/.config/md-ai/config.json` → `md-ai/config.json`
- `~/.config/md-ai/SYSTEM.md` → `md-ai/SYSTEM.md`
- `~/.config/opencode/opencode.json` → `opencode/opencode.json`
- `~/.config/opencode/AGENTS.md` → `agents/AGENTS.md`
- `~/.config/opencode/skills` → `agents/skills`
- `~/.claude/CLAUDE.md` → `agents/AGENTS.md`
- `~/.claude/skills` → `agents/skills`
- `~/.claude/settings.local.json` → `.claude/settings.local.json`
- `~/.codex/AGENTS.md` → `agents/AGENTS.md`
- `~/.codex/skills` → `agents/skills`
- `~/.codex/config.toml` → `codex-cli/config.toml`
