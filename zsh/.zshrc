autoload -Uz compinit && compinit

eval "$(starship init zsh)"

eval "$(zoxide init zsh --cmd cd)"

source <(fzf --zsh)

export EDITOR="hx"

# bun completions
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun" && compdef _bun bun

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"

# aliases
alias l="ls -lah"
alias lg="lazygit"
alias ld="lazydocker"
alias oc="opencode"
alias reload="source ~/.zshrc"
alias c="clear"
alias ..="cd .."
alias ...="cd ../.."

# quick project navigation
alias p="cd ~/Projects"

# copy current directory to clipboard
alias cpwd="pwd | pbcopy"

# extract PR review data from GitHub
alias prx="pr-review"

alias ttg="ttab git lazygit"
alias tta="ttab agent pi"

# show path entries one per line
alias path='echo $PATH | tr ":" "\n"'

# dotfiles custom scripts
export PATH="$HOME/Developer/dotfiles/scripts/bin:$PATH"

# auto-attach tmux in Ghostty unless disabled with TMUX_AUTO_ATTACH=0
if [[ -o interactive ]] && command -v tmux >/dev/null 2>&1; then
  if [[ -z "${TMUX:-}" && -z "${SSH_CONNECTION:-}" && "${TERM_PROGRAM:-}" == "ghostty" && "${TMUX_AUTO_ATTACH:-1}" == "1" ]]; then
    tj .
  fi
fi

[ -f "$HOME/.config/secrets/env" ] && source "$HOME/.config/secrets/env"
[ -f "$HOME/.config/op/plugins.sh" ] && source "$HOME/.config/op/plugins.sh"
[ -f "$HOME/.deno/env" ] && . "$HOME/.deno/env"

# Vite+ bin (https://viteplus.dev)
. "$HOME/.vite-plus/env"
