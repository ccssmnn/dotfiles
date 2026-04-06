export PATH="/opt/homebrew/bin:$PATH"

# pnpm
export PNPM_HOME="$HOME/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end

# go (disabled - not installed)
# export PATH="$PATH:$(go env GOPATH)/bin"

# custom scripts
export PATH="$PATH:$HOME/Developer/dotfiles/scripts/bin"
