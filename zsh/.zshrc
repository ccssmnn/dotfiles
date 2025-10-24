eval "$(starship init zsh)"

eval "$(zoxide init zsh --cmd cd)"

source <(fzf --zsh)

export EDITOR="hx"
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export PATH="$ANDROID_SDK_ROOT/platform-tools:$PATH"
