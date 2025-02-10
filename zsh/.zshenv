export PATH="/opt/homebrew/bin:$PATH"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

nvm use 22 --silent

# pnpm
export PNPM_HOME="/Users/carlassmann/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end

function ccssmnn-tags() {
  node ~/Projects/dotfiles/scripts/bin/tags.js "$@"
}

function ccssmnn-sort() {
  node ~/Projects/dotfiles/scripts/bin/sort.js "$@"
}

function ccssmnn-ai() {
  node ~/Projects/dotfiles/scripts/bin/ai.js "$@"
}
