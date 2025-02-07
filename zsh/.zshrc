export PATH="/opt/homebrew/bin:$PATH"

eval "$(starship init zsh)"

eval "$(zoxide init zsh --cmd cd)"


export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

nvm use 22 --silent

# pnpm
export PNPM_HOME="/Users/carlassmann/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end

# utility to insert tags around a selection in helix
function tags_around_selection() {
  echo "<xxx>"
  cat
  echo "</xxx>"
}
