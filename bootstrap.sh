#!/bin/zsh

# install homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# install things with homebrew
brew install \
  tmux \
  starhip \
  node@20 \
  gh \
  go \
  helix \
  lazygit

# install tooling for developing in nodejs
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm install -g \
  prettier \
  bash-language-server \
  typescript-language-server \
  @tailwindcss/language-server \
  vscode-langservers-extracted

# install tooling for developing in go
go install golang.org/x/tools/gopls@latest
go install github.com/go-delve/delve/cmd/dlv@latest
go install golang.org/x/tools/cmd/goimports@latest
go install github.com/cheat/cheat/cmd/cheat@latest

# create symlinks

script_dir=$(dirname "$(readlink -f "$0")")
dotfiles_dir="$script_dir"
ignore_list=(
    "bootstrap.sh"
    "README.md"
)

files_to_symlink=($(find "$dotfiles_dir" -maxdepth 1 -type f ! -name "$(printf "! -name %s " "${ignore_list[@]}")"))
files_to_symlink+=($(find "$dotfiles_dir/.config" -mindepth 1 -maxdepth 1 -type f))
files_to_symlink+=($(find "$dotfiles_dir/.config" -mindepth 1 -maxdepth 1 -type d))

for file in "${files_to_symlink[@]}"; do
  file=$(basename "$file_path")

  if [[ "$file_path" == *"/.config/"* ]]; then
    target_dir="$HOME/.config"
  else
    target_dir="$HOME"
  fi
  ln -s "$file_path" "$target_dir/$file"
  echo "Created symlink for $file"
done
