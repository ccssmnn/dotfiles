#!/bin/zsh

# install node version manager and node
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22

# install homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# install things with homebrew
brew install \
  tmux \
  starhip \
  gh \
  helix \
  lazygit \
  zoxide \
  fzf \
  xplr \
  cloc

# install tooling for developing in nodejs
npm install -g \
  prettier \
  bash-language-server \
  typescript-language-server \
  @tailwindcss/language-server \
  vscode-langservers-extracted

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
