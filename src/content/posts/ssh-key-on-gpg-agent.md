---
date: 2026-04-01
title: How to add a key for SSH to GPG Agent?
---

The first time I did this, it was difficult. The second time was a little easier. Now, on the third time, I've had enough! It's been so long since the last time that I've forgotten most of the process 😅

Although I know [I could just search](https://www.youtube.com/watch?v=KlniB27j4Yg) for this information (as I'm doing right now), I'm tired of repeatedly doing it. Since it's a frequent pain point, I'm finally creating my own guide. Why is it frequent for me? I don't know, and that's besides the point 😒

Before you spend time reading, I'm assuming you already have a working GPG Agent for SSH authentication, perhaps backed by a [YubiKey](https://www.yubico.com/), and that you want to add another key for SSH use. I won't cover the agent setup itself, only how to add the key, whether it's a simple SSH key or another GPG key.

# The ~wrong~ easy way: plain SSH key in GPG Agent

Generate an **SSH** key with `ssh-keygen -t ed25519 -C email@example.com`, and then run `ssh-add ~/.ssh/<priv_file>`. That's it!

It won't appear in `gpg --list-keys`, and it will use the deprecated `~/.gnupg/sshcontrol` file, but it works 🤷 You can even remove the files right after adding the key to the agent, and it will still work 🤯

Removing it later is troublesome, especially if you've forgotten that you added it this way. To fully remove it, you'll need to find the matching line in `sshcontrol` and delete it.

# The proper way: GPG auth key with SSH capabilities

Before continuing, let's remove those legacy keys before you forget about them. Unfortunately, a normal `ssh-add -d` won't work; you have to remove it by editing the `~/.gnupg/sshcontrol` file. The file should look something like this:

```

# List of allowed ssh keys.  Only keys present in this file are used
# ....
# flags.   Prepend the keygrip with an '!' mark to disable it.

# Ed25519 key added on: 2026-03-26 21:53:42
# Fingerprints:  MD5:...
#                SHA256:...
... 0
```

If you added comments to your keys, you can differentiate them by listing them with `ssh-add -l`, and then disable the key by prepending a `!` to the beginning of its line. However, sshcontrol has been deprecated since [GnuPG 2.3.7](https://lists.gnupg.org/pipermail/gnupg-announce/2022q3/000474.html) in favor of a key attribute, so we should aim for a clean file. Therefore, I say very politely, delete those damn lines!

To start correctly, generate a **GPG** key with `gpg --gen-key`. It won't have an authentication subkey by default, so you'll need to add one. This involves a series of interactive commands that can't be easily automated. Alternatively, you can mirror the approach used in [drduh's excellent YubiKey guide](https://github.com/drduh/YubiKey-Guide) and execute it in a single shot:

```
# Create the main key
export IDENTITY="Unlucky Wanderer <author@badrng.xyz>"
export KEY_TYPE="rsa4096"
export PASSWORD="" # empty for no password
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

Once you have these keys, you can tell GPG Agent to consider the authentication key for SSH use by toggling an attribute:

```
# List the keys
gpg -K --with-keygrip $KEYID

# Use the keygrip from the [A] sub key
gpg-connect-agent 'keyattr <auth keygrip> Use-for-ssh: true' /bye

# Grab the SSH pubkey to put on servers
gpg --export-ssh-key $KEYID
```

By configuring a proper GPG authentication key under a master key, you can also create signing keys under it for signing your commits! But that's left as an exercise for the reader 😅

And to top it all off, you can remove it by simply deleting it from your agent with `gpg --delete-keys --delete-secret-keys $KEYID` 🎉

## References

I couldn't have written half of this without the help of those who suffered before me 🙃

- [Use GPG for SSH keys](https://goral.net.pl/post/use-gpg-for-ssh-keys/)
- [Now that `sshcontrol` has been deprecated, how to use gpg key for ssh authentication with an agent?](https://security.stackexchange.com/questions/276688/now-that-sshcontrol-has-been-deprecated-how-to-use-gpg-key-for-ssh-authentica)
