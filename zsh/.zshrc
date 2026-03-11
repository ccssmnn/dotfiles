autoload -Uz compinit && compinit

eval "$(starship init zsh)"

eval "$(zoxide init zsh --cmd cd)"

source <(fzf --zsh)

export EDITOR="hx"
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export PATH="$ANDROID_SDK_ROOT/platform-tools:$PATH"

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

# show path entries one per line
alias path='echo $PATH | tr ":" "\n"'
[ -f "$HOME/.config/secrets/env" ] && source "$HOME/.config/secrets/env"
source /Users/carlassmann/.config/op/plugins.sh
. "/Users/carlassmann/.deno/env"
