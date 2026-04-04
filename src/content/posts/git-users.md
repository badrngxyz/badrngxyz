---
draft: true
date: 2026-04-03
title: Managing multiple git users
---

I don't know about you, but I can't have work and personal intertwined. It's cool to have a graph full due to company contributions, but the noise outside of work degrades my mental health. To help separate those two areas, and a third one with this blog, I create separate accounts, but this brings a lot of pain 🫠

# Configuring different context

The first thing is emails and usernames. I don't want to constantly switch users manually when moving repositories, or configure every single repository manually. That's where the beautiful `[includeIf]` comes in handy.

All my repositories live inside `~/Repositories`, and then their URL gets mirrored. For example, the blog lives at `~/Repositories/github.com/badrngxyz/badrngxyz`. Because of that separation by users, I can leverage `[includeIf]` by matching the folder and saving a config colocatted with all those repositories. That way, I can have a global config with under `~/.gitconfig` while doing personalized configs for each of the other context:

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

However, if commiting was it all, we could end it here and call it a day. How do you push your code now? Most remotes these days require you to have different keys per user.

# Handling multiple SSH keys

The SSH client usually picks the first key available, so it becomes a problem when you have multiple unlocked keys. Unfortunately, remotes expect you to clone with the `git` user, so it's not like you can do `badrngxyz@github.com:...`. Therefore, to make your SSH client route it with the correct key. If your workflow isn't complex, and you're fine with cloning by hand, an alias on `~/.ssh/config` is enough:

```
Host badrngxyz#github.com
    HostName github.com
    IdentityFile ~/.ssh/keys/badrngxyz.pub
    IdentitiesOnly yes
EOT
```

That enables you to clone with the correct key with `git@badrngxyz#github.com:...`, which get the proper key for authentication and works! But who wants to edit all of their clone URLs with this? Another gitconfig to the rescue for more automation 🎉

```
[url "git@badrngxyz#github.com:badrngxyz"]
	insteadOf = git@github.com:badrngxyz
```

With the following config, you can do a simple `git clone git@github.com:badrngxyz/...` and git will rewrite it before handing it off to the SSH client. Howeeever... if your workflow includes the wonderful GitHub CLI, you'll quickly find an annoying problem:

```
none of the git remotes configured for this repository point to a known GitHub host. To tell gh about a new GitHub host, please use `gh auth login`
```

GitHub CLI reads your config too, so if the config specifies a strange host, it can't identify the proper host that would be used by SSH and fails. The keys problem exists only at SSH level, but now everything that tries to derive an URL for a repository, based on your config, will fail because of that 😢 What if we could achieve the initial dream? What if there was another customization at git level that allowed us to switch hosts magically only for SSH? That's where `core.sshCommand` comes in! You can have a custom key in each of those personal files:

```
# ~/Repositories/github.com/badrngxyz/.gitconfig
[core]
    sshCommand = "ssh -F /dev/null -i ~/.ssh/keys/badrngxyz.pub"
```

The `-F /dev/null` makes the ssh command ignore whatever config you have, so that it skips any overwrite you've set before. But now, it's one more thing to remember on each config 😩 Also, it will not work for cloning repositories because those don't know about your config yet. What about creating our own little wrapper?

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

The job of that script is detects what repository Git is operating on and derives the proper identity file from it. Git sends the command it wants the server to execute over the client as `"git-... 'owner/repo.git'`, which we use to extract the owner from and check for a matching key file! Also, we just abstracted the manual correlation of an alias to an identity file, so you can clean that from the `~/.ssh/config` file.

Now imagine switching a machine and losing all of that. Let's use Git to save your config! [.dotfiles](https://dotfiles.github.io/) for the win 💪 Aaaaand now everyone knows which are your contexts.

# Keeping it all secret

That's just a matter of using `[include]` in your main `~/.gitconfig` and then storing those files separately 🤷 The benefit is that all you'd need is to pull the file from safe storage and put in an already established location, no need to redo the whole setup 🙌

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

That’s it! The additional contexts got their own config and keys. You simply switch folders and the system sets the correct user 🥳

# Bonus: Store repositories everywhere

Depending on your setup, it doesn't make sense to store all repositories under a specific folder structure. There are time where that setup becomes isn't flexible enough. Since the user configs need the repository to exist, and we clone repositories most of the time, you can use the remote URL to derive the user 🤯

```
# ~/.config/git/99-local
[includeIf "hasconfig:remote.*.url:git@*:badrngxyz/**"]
	path = "~/.config/git/contexts/badrngxyz.gitconfig"
```

A word of caution though. If you're used to not having a specific place for the repositories, you'll need to be sure to setup the remote first thing when developing. Otherwise, because there's no remote, Git won't have the information to pick the correct user. Just in case, use both ways, there's no harm in that 🤣

## References

The system has evolved throughout my career and this is the most flexible way I found to configure it. The bad thing is that I don't remember each influence I had along the way. The SSH wrapper is the latest addition. I ideated it alongside Lumo and the following helped me simplify the SSH config with aliases situation:

- [Configure git to use a specific SSH key for a repository permanently.](https://www.rusingh.com/use-a-different-ssh-key-permanently-for-a-specific-git-repo/)
- [How to match SSH config based on URL path or SSH arguments (for github deploy keys)?](https://stackoverflow.com/questions/60683677/how-to-match-ssh-config-based-on-url-path-or-ssh-arguments-for-github-deploy-ke)
