export PATH="/opt/homebrew/bin:$PATH"

# fnm
FNM_PATH="/Users/carlassmann/Library/Application Support/fnm"
if [ -d "$FNM_PATH" ]; then
  export PATH="/Users/carlassmann/Library/Application Support/fnm:$PATH"
  eval "`fnm env`"
fi

eval "$(fnm env --use-on-cd --shell zsh)"

fnm use --log-level quiet 22

# pnpm
export PNPM_HOME="/Users/carlassmann/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end
