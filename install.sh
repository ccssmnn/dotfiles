#!/usr/bin/env bash

set -e

DOTFILES_DIR="$HOME/Projects/dotfiles"

echo "🚀 Installing dotfiles..."

# Create necessary directories
mkdir -p "$HOME/.config/helix"
mkdir -p "$HOME/.config/ghostty"
mkdir -p "$HOME/.config/xplr"
mkdir -p "$HOME/.config/md-ai"
mkdir -p "$HOME/.config/opencode"

# Function to create symlink (overwrites existing)
create_symlink() {
  local source="$1"
  local target="$2"
  
  # Remove existing file/symlink
  if [ -e "$target" ] || [ -L "$target" ]; then
    rm -rf "$target"
  fi
  
  # Create parent directory if needed
  mkdir -p "$(dirname "$target")"
  
  # Create symlink
  ln -sf "$source" "$target"
  echo "✓ Linked $target"
}

# Symlink shell configs
create_symlink "$DOTFILES_DIR/zsh/.zshrc" "$HOME/.zshrc"
create_symlink "$DOTFILES_DIR/zsh/.zshenv" "$HOME/.zshenv"

# Symlink git configs
create_symlink "$DOTFILES_DIR/git/.gitconfig" "$HOME/.gitconfig"
create_symlink "$DOTFILES_DIR/git/.gitignore_global" "$HOME/.gitignore_global"

# Symlink aerospace
create_symlink "$DOTFILES_DIR/aerospace/aerospace.toml" "$HOME/.aerospace.toml"

# Symlink .config directories
create_symlink "$DOTFILES_DIR/helix" "$HOME/.config/helix"
create_symlink "$DOTFILES_DIR/ghostty/config" "$HOME/.config/ghostty/config"
create_symlink "$DOTFILES_DIR/xplr" "$HOME/.config/xplr"
create_symlink "$DOTFILES_DIR/md-ai/config.json" "$HOME/.config/md-ai/config.json"
create_symlink "$DOTFILES_DIR/md-ai/SYSTEM.md" "$HOME/.config/md-ai/SYSTEM.md"
create_symlink "$DOTFILES_DIR/opencode/opencode.json" "$HOME/.config/opencode/opencode.json"
create_symlink "$DOTFILES_DIR/opencode/AGENTS.md" "$HOME/.config/opencode/AGENTS.md"

echo ""
echo "📦 Installing scripts..."
cd "$DOTFILES_DIR/scripts"
if command -v pnpm &> /dev/null; then
  pnpm install
  pnpm link --global
  echo "✓ Scripts installed globally"
else
  echo "⚠️  pnpm not found - skipping scripts installation"
  echo "   Install Node.js and pnpm, then run:"
  echo "   cd $DOTFILES_DIR/scripts && pnpm install && pnpm link --global"
fi

echo ""
echo "✅ Dotfiles installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Install Homebrew packages (see README.md)"
echo "  2. Install Node.js via fnm"
echo "  3. Install global npm packages (see README.md)"
echo "  4. Restart your terminal or run: source ~/.zshrc"
