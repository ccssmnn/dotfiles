# ccssmnn - .dotfiles

I mainly develop in NodeJS and Go using Helix and Lazygit.

## Docker

For a IDE Docker container:

```docker
FROM ubuntu:latest

# Install necessary packages
RUN apt-get update && apt-get install -y \
    curl \
    zsh \
    git

# Clone dotfiles repository into the home directory
WORKDIR /root
RUN git clone https://github.com/ccssmnn/dotfiles.git

# Set up dotfiles and install dependencies
WORKDIR /root/dotfiles
RUN chmod +x bootstrap.sh && ./bootstrap.sh

# Set default shell to zsh
CMD ["zsh"]
```
