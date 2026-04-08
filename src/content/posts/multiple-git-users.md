---
date: 2026-04-08
title: Managing multiple git users
---

I don't know about you, but I can't have work and personal intertwined. While a contribution graph filled with activity is nice, the constant notifications from work while I'm pursuing hobbies negatively impact my mental well-being. To separate these areas (and a third for this blog), I use separate accounts, but this introduces a lot of friction 🫠

# Configuring different contexts

The first issue is managing emails and usernames. I don't want to manually switch when moving between repositories or configure them individually. That's where the wonderful `[includeIf]` directive comes in handy.

All my repositories are in `~/Repositories`, under a folder mirroring their remote URL. This structure allows me to leverage `[includeIf]` by matching the folder and referencing a configuration file at the context level. This way, I can maintain a global configuration in `~/.gitconfig` while having personalized configurations for each context:

```
# ~/.gitconfig
[user]
  name = "An internet random"
  email = "random@internet.org"

[includeIf "gitdir:~/Repositories/github.com/badrngxyz/**"]
  path = "~/Repositories/github.com/badrngxyz/.gitconfig"

# ~/Repositories/github.com/badrngxyz/.gitconfig
[user]
  name = "Unlucky Wanderer"
  email = "author@badrng.xyz"
```

However, committing is only half the battle. Pushing code introduces another challenge: most remotes now require distinct SSH keys for each user 🥲

# Handling multiple SSH keys

Because the SSH client selects the first available key, it creates conflicts when multiple unlocked keys exist. As wonderful as a `git clone badrngxyz@...` would be, `Match` rules on SSH clients only work for local users (which we don't want to switch), and remotes expect cloning with the `git` user. Since a `Match User badrngxyz` isn't viable, the alternative is using `Host` aliases:

```
Host badrngxyz#github.com
  HostName github.com
  IdentityFile ~/.ssh/keys/badrngxyz.pub
  IdentitiesOnly yes
```

That enables you to clone from `git@badrngxyz#github.com:...` and have the correct key selected for authentication! But who wants to edit all of their clone URLs with this? Another gitconfig to the rescue for more automation 🎉

```
[url "git@badrngxyz#github.com:badrngxyz"]
  insteadOf = git@github.com:badrngxyz
```

With this configuration, the host in `git clone git@github.com:badrngxyz/...` will be rewritten before reaching the SSH client. Howeeever... it introduces a problem if you use GitHub CLI:

```
none of the git remotes configured for this repository point to a known GitHub host. To tell gh about a new GitHub host, please use `gh auth login`
```

GitHub CLI also reads your Git configuration. When the configuration specifies an unfamiliar host, the CLI cannot identify the correct host for SSH and fails. While the key issue is specific to the SSH level, anything that attempts to derive a repository URL from your configuration will now fail 😢 What if we could achieve the initial dream? What if there was another customization at git level that allowed us to switch hosts magically only for SSH? Enters `core.sshCommand`!

```
# ~/Repositories/github.com/badrngxyz/.gitconfig
[core]
    sshCommand = "ssh -F /dev/null -i ~/.ssh/keys/badrngxyz.pub"
```

The keys goes into `-i` and `-F /dev/null` option ensures the ssh command ignores any existing configurations, preventing conflicts while selecting the right identity. However, this adds another setting to remember for each configuration file 😩 Also, it doesn't work for cloning repositories, as they don't yet have the configuration. Given we can customize the SSH command, what about creating our own wrapper?

```
# ~/.local/bin/git-ssh
#!/bin/bash

owner=$(
  printf '%s\n' "$@" | \
  awk -f <(cat - <<'EOT'
    BEGIN { has_git = 0; owner = "" } {
      # Detect git-* command
      if ($0 ~ /^git-.+$/) has_git = 1

      # Extract owner from .git path
      if ($0 ~ /\.git/) {
        if (match($0, /'.*\.git'/)) {
          path = substr($0, RSTART + 1, RLENGTH - 1)
          owner = path
          # The first path segment gives the "owner" context
          sub(/\/.*/, "", owner)
        }
      }
    } END {
      if (has_git && owner != "") print owner
    }
EOT
))

if [ -n "$owner" ] && [ -f "$HOME/.ssh/keys/${owner}.pub" ]; then
  exec ssh -F /dev/null -i "$HOME/.ssh/keys/${owner}.pub" "$@"
else
  exec ssh "$@"
fi

# ~/.gitconfig
[core]
    sshCommand = "~/.local/bin/git-ssh"
```

The script doesn't handle SSH itself; it only detects the repository Git is operating on, infers the correct identity file, and then hands it off to your true client. Because Git sends the command it wants the server to execute as `"git-... 'owner/repo.git'"`, we can extract the owner from it and check for a matching identity. Also, we abstracted the manual correlation of an alias to a key, allowing for an empty `~/.ssh/config` file!

Now imagine switching a machine and losing all of that. Let's use Git to save your configuration! [.dotfiles](https://dotfiles.github.io/) for the win 💪 Aaaaand now everyone knows the contexts you're in.

# Keeping it all secret

To separate those configurations even further, we can use `[include]` in `~/.gitconfig` for another layer of indirection. It allows you to store the files separately while having a predefined location for the sensitive configuration; no need to redo the whole setup 🙌

```
# ~/.gitconfig
[user]
  name = "An internet random"
  email = "random@internet.org"
[core]
    sshCommand = "~/.local/bin/git-ssh"
[include]
	path = "~/.config/git/99-local"

# ~/.config/git/99-local
[includeIf "gitdir:~/Repositories/github.com/badrngxyz/**"]
	path = "~/Repositories/github.com/badrngxyz/.gitconfig"

# ~/Repositories/github.com/badrngxyz/.gitconfig
[user]
    name = "Unlucky Wanderer"
    email = "author@badrng.xyz"
```

That’s it! The additional contexts got their own configuration and keys. Simply changing directories will activate the correct user settings 🥳

# Bonus: Store repositories everywhere

Storing all repositories under a specific folder structure may be too rigid. Given that user configurations require the repository to exist, you can derive the user from the remote URL for cloned repositories 🤯

```
# ~/.config/git/99-local
[includeIf "hasconfig:remote.*.url:git@*:badrngxyz/**"]
	path = "~/.config/git/contexts/badrngxyz.gitconfig"
```

A word of caution though: for new repositories, you must setup the remote URL before making any commits. Otherwise, because there's no remote, Git won't have the necessary information to select the correct user. Just in case, use both ways; there's no harm in that 🤣

## References

The system has evolved with me throughout my career. It is the most versatile configuration I've discovered, but I don't remember all influences I had. As the SSH configuration was the most recent battle, I can say the following resources helped me:

- [Configure git to use a specific SSH key for a repository permanently.](https://www.rusingh.com/use-a-different-ssh-key-permanently-for-a-specific-git-repo/)
- [How to match SSH config based on URL path or SSH arguments (for github deploy keys)?](https://stackoverflow.com/questions/60683677/how-to-match-ssh-config-based-on-url-path-or-ssh-arguments-for-github-deploy-ke)
