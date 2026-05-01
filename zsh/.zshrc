autoload -Uz compinit && compinit

eval "$(starship init zsh)"

eval "$(zoxide init zsh --cmd cd)"

source <(fzf --zsh)

export EDITOR="hx"

# node
eval "$(fnm env --use-on-cd --shell zsh)"

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
alias cc="claude --dangerously-skip-permissions"
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

[ -f "$HOME/.config/secrets/env" ] && source "$HOME/.config/secrets/env"
[ -f "$HOME/.config/op/plugins.sh" ] && source "$HOME/.config/op/plugins.sh"
[ -f "$HOME/.deno/env" ] && . "$HOME/.deno/env"

# pnpm
export PNPM_HOME="/Users/carlassmann/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end
