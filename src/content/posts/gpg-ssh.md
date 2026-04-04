---
draft: true
date: 2026-04-01
title: How to add a key for SSH to GPG Agent?
---

The first time was difficult enough, the second a little bit easier, and now it's the third time I have had enough of this! Also, I kind of forgot most of things already because it's been a long since time since the last one 😅

Though I understand that [I could just search](https://www.youtube.com/watch?v=KlniB27j4Yg) for these kinds of things (as I'm doing right now), it became a problem because I'm tired of searching for the information. Therefore, since it's a frequent pain, I'm finally creating my own guide. Why is it frequent for me? I don't know, and that's beside the point 😒

Before proceeding, I assume a working GPG Agent for SSH authentication, maybe backed by [YubiKey](https://www.yubico.com/), and that you want to include another key for SSH use. I won't go over the agent setup, only on how to add the key: with a simple SSH key, or with another GPG key.

# The ~wrong~ easy way: plain SSH key in GPG Agent

Generate a **SSH** key with `ssh-keygen -t ed25519 -C email@example.com`, and then run `ssh-add ~/.ssh/<priv_file>`. That's it!

It won't show in `gpg --list-keys` though, and it'll will use the deprecated `~/.gnupg/sshcontrol`. Right after adding it to the agent you can remove the files, and the key will still work 🤯

It's somewhat troublesome to remove it once you forget that you added it this way. To fully remove it, you'll need to find the line matching it in ~sshcontrol~ and delete it

# The proper way: GPG auth key with SSH capabilities

Before continuing, you'll need to remove the previous key. Unfortunately, a normal `ssh-add -d` doesn't work, it has to be removed by editing the `~/.gnupg/sshcontrol` file. That file should look something like:

```

# List of allowed ssh keys.  Only keys present in this file are used
# ....
# flags.   Prepend the keygrip with an '!' mark to disable it.

# Ed25519 key added on: 2026-03-26 21:53:42
# Fingerprints:  MD5:...
#                SHA256:...
... 0
```

If you add comments to your keys, you can tell the keys apart by listing them with `ssh-add -l`, and then disable the key by prepending a `!` to the beginning. However, sshcontrol has been deprecated since [GnuPG 2.3.7](https://lists.gnupg.org/pipermail/gnupg-announce/2022q3/000474.html) in favor of a key attribute, so we should aim for a clean file. Hence, I say very politely, delete those damn lines!

To start right, we must generate a **GPG** key with `gpg --gen-key`. It won't have an authentication subkey by default, so you'll need to add it. And that includes a bunch of interative commands, which can't be automated away. Alternatively, you can mirror what's used on the wonderful [YubiKey guide by drduh](https://github.com/drduh/YubiKey-Guide), and singleshot it:

```
# Create the main key
export IDENTITY="Unlucky Wanderer <author@badrng.xyz>"
export KEY_TYPE="rsa4096"
export PASSWORD=""
export EXPIRATION="" # 2021-01-01, Xy, or empty for no expiration

echo "$PASSWORD" | gpg --batch --passphrase-fd 0 \
        --quick-generate-key "$IDENTITY" "$KEY_TYPE" cert never

# Get the key information
export KEYID=$(gpg -k --with-colons "$IDENTITY" | \
    awk -F: '/^pub:/ { print $5; exit }')

export KEYFP=$(gpg -k --with-colons "$IDENTITY" | \
    awk -F: '/^fpr:/ { print $10; exit }')

printf "\nKey ID/Fingerprint: %20s\n%s\n\n" "$KEYID" "$KEYFP"

# Create authentication key
echo "$PASSWORD" | gpg --batch --pinentry-mode=loopback --passphrase-fd 0 \
        --quick-add-key "$KEYFP" "$KEY_TYPE" auth "$EXPIRATION"
```

Once you have those, you can tell GPG Agent to consider it for SSH use by toggling an attribute in the authentication key: 

```
# List the keys
gpg -K --with-keygrip $KEYID

# Pick the keygrip from the [A] sub key
gpg-connect-agent 'keyattr <auth keygrip> Use-for-ssh: true' /bye

# Grab the SSH pubkey to put on servers
gpg --export-ssh-key $KEYID
```

By configuring a proper GPG authentication key under a master key, you get to also create signing keys under it for signing your commits! But that's left as an exercise for the reader 😅 

And to top it all, you can remove it by simply removing it from your agent with `gpg --delete-keys --delete-secret-keys $KEYID` 🎉

## References

I couldn't have written half of this if it weren't for those that suffered before 🙃. Here are my sources: 

- [Use GPG for SSH keys](https://goral.net.pl/post/use-gpg-for-ssh-keys/)
- [Now that `sshcontrol` has been deprecated, how to use gpg key for ssh authentication with an agent?](https://security.stackexchange.com/questions/276688/now-that-sshcontrol-has-been-deprecated-how-to-use-gpg-key-for-ssh-authentica)
- [How to match SSH config based on URL path or SSH arguments (for github deploy keys)?](https://stackoverflow.com/questions/60683677/how-to-match-ssh-config-based-on-url-path-or-ssh-arguments-for-github-deploy-ke)
