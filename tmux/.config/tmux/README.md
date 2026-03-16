# Tmux setup

This setup keeps tmux intentionally minimal:

- one thin top status line
- Ghostty-driven light / dark theme switching
- project-based sessions via `tj`
- no plugin manager
- no theme framework

## Key idea

Use Ghostty tabs for top-level browsing and tmux inside a tab when you want panes or a persistent project workspace.

## Prefix

The tmux prefix is the default:

- `Ctrl-b`

This keeps the setup close to stock tmux behavior.

## Common keys

- `Ctrl-b c` — new window in current path
- `Ctrl-b R` — rename window
- `Ctrl-b ,` / `Ctrl-b .` — previous / next window
- `Ctrl-b |` — split horizontally
- `Ctrl-b -` — split vertically
- `Ctrl-b h/j/k/l` — move between panes
- `Ctrl-b H/J/K/L` — resize panes
- `Ctrl-b s` — session/window chooser
- `Ctrl-b x` — kill pane
- `Ctrl-b X` — kill window
- `Ctrl-b r` — reload tmux config

## Sessions

- `tj` — pick a project and attach/create its tmux session
- `tj .` — use the current git repo or current directory
- `ttab <name>` — open a named tmux window in the current path

## Automatic theming

This config uses tmux 3.6+ hooks:

- `client-light-theme`
- `client-dark-theme`

With Ghostty configured for separate light/dark themes, tmux should switch its own UI automatically when the terminal appearance changes.
