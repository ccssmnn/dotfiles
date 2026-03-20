#!/usr/bin/env bash

set -e

DOTFILES_DIR="$HOME/Developer/dotfiles"

echo "🚀 Installing dotfiles..."

# Create necessary directories
mkdir -p "$HOME/.config/helix"
mkdir -p "$HOME/.config/ghostty"
mkdir -p "$HOME/.config/tmux/themes"
mkdir -p "$HOME/.config/pi"
mkdir -p "$HOME/.pi/agent"
mkdir -p "$HOME/.config/secrets"

# Function to create symlink
create_symlink() {
  local source="$1"
  local target="$2"

  if [ -L "$target" ]; then
    rm -rf "$target"
  elif [ -e "$target" ]; then
    local reply
    read -r -p "⚠️  $target exists and is not a symlink. Replace it? [y/N] " reply
    case "$reply" in
      [yY]|[yY][eE][sS])
        rm -rf "$target"
        ;;
      *)
        echo "- Skipped $target"
        return 0
        ;;
    esac
  fi

  mkdir -p "$(dirname "$target")"
  ln -sf "$source" "$target"
  echo "✓ Linked $target"
}

SECRETS_FILE="$HOME/.config/secrets/env"
SECRETS_MANIFEST="$DOTFILES_DIR/agents/secrets.required"

ensure_secrets_file() {
  touch "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"
}

get_secret_value() {
  local key="$1"
  local line
  line=$(grep -E "^export ${key}=" "$SECRETS_FILE" | tail -n 1 || true)
  line="${line#export ${key}=}"
  line="${line#\"}"
  line="${line%\"}"
  echo "$line"
}

set_secret_value() {
  local key="$1"
  local value="$2"
  local escaped="$value"
  escaped="${escaped//\\/\\\\}"
  escaped="${escaped//\"/\\\"}"

  local tmp
  tmp=$(mktemp)
  awk -v key="$key" -v value="$escaped" '
    BEGIN { replaced = 0 }
    {
      if ($0 ~ "^export " key "=") {
        if (!replaced) {
          print "export " key "=\"" value "\""
          replaced = 1
        }
      } else {
        print $0
      }
    }
    END {
      if (!replaced) {
        print "export " key "=\"" value "\""
      }
    }
  ' "$SECRETS_FILE" > "$tmp"
  mv "$tmp" "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"
}

prompt_secret() {
  local key="$1"
  local description="$2"
  local current
  current=$(get_secret_value "$key")

  if [ -n "$current" ] && [ "$current" != "REPLACE_ME" ]; then
    echo "✓ Secret already set: $key"
    return 0
  fi

  if [ ! -r /dev/tty ]; then
    echo "- No TTY for secret prompt. Leaving placeholder for $key"
    set_secret_value "$key" "REPLACE_ME"
    return 0
  fi

  echo "" > /dev/tty
  echo "🔐 Required secret: $key" > /dev/tty
  echo "   $description" > /dev/tty

  local value
  while true; do
    read -r -s -p "Enter value for $key (or type 'skip'): " value < /dev/tty
    echo "" > /dev/tty

    if [ "$value" = "skip" ]; then
      echo "- Skipped $key (set it later in $SECRETS_FILE)"
      set_secret_value "$key" "REPLACE_ME"
      return 0
    fi

    if [ -z "$value" ]; then
      echo "- Value cannot be empty"
      continue
    fi

    set_secret_value "$key" "$value"
    echo "✓ Saved $key in $SECRETS_FILE"
    return 0
  done
}

setup_required_secrets() {
  ensure_secrets_file

  if [ ! -f "$SECRETS_MANIFEST" ]; then
    echo "- No secrets manifest found at $SECRETS_MANIFEST"
    return 0
  fi

  while IFS='|' read -r key description; do
    if [ -z "$key" ]; then
      continue
    fi

    case "$key" in
      \#*)
        continue
        ;;
    esac

    prompt_secret "$key" "$description"
  done < "$SECRETS_MANIFEST"
}

# Symlink shell configs
create_symlink "$DOTFILES_DIR/zsh/.zshrc" "$HOME/.zshrc"
create_symlink "$DOTFILES_DIR/zsh/.zshenv" "$HOME/.zshenv"

# Symlink git configs
create_symlink "$DOTFILES_DIR/git/.gitconfig" "$HOME/.gitconfig"
create_symlink "$DOTFILES_DIR/git/.gitignore_global" "$HOME/.gitignore_global"

# Symlink .config directories
create_symlink "$DOTFILES_DIR/helix" "$HOME/.config/helix"
create_symlink "$DOTFILES_DIR/ghostty/config" "$HOME/.config/ghostty/config"
create_symlink "$DOTFILES_DIR/tmux/.config/tmux/tmux.conf" "$HOME/.config/tmux/tmux.conf"
create_symlink "$DOTFILES_DIR/tmux/.config/tmux/themes" "$HOME/.config/tmux/themes"
create_symlink "$DOTFILES_DIR/tmux/.config/tmux/README.md" "$HOME/.config/tmux/README.md"
create_symlink "$DOTFILES_DIR/agents/claude" "$HOME/.claude"

setup_required_secrets

echo ""
echo "✅ Dotfiles installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Install Homebrew packages (see README.md)"
echo "  2. Install Node.js via fnm"
echo "  3. Restart your terminal or run: source ~/.zshrc"
