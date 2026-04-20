---
date: 2026-04-18
title: Sending suggestions outside GitHub
subtitle: The ancient ways are still useful
---

There are many reasons why one might want to send suggestions outside of GitHub. Perhaps your suggestion is too extensive, such as a completely different approach for one portion, or you simply don't want to commit to someone else's branch. Git started without GitHub, and it's built on the concept of sending changes around, so why limit ourselves to a mere UI when we can unleash the mighty CLI?

# Extracting the changes

Suggestions are essentially a diff, but you need to present them in a way another person can analyze. Before your coworker can see your changes, you first need to make them. The beauty of working with diffs directly is that you can use your local toolchain. Let's say your buddy wants a review on `awesome-feature`:

```sh
git switch main
git fetch
git switch awesome-feature
git switch -c awesome-suggestions
# do your changes
git commit "suggestions from your pal"
```

We create a separate branch just to make things easier in case the original branch moves in the meantime. Now we have to package that patch and send it over the wire. Git works based on patches, so naturally, there's already a command for it 🎉

```sh
git format-patch awesome-feature..awesome-suggestions --stdout > suggestions.patch
```

You can send that file to your coworker however you prefer and let them decide what's worth including in their feature.

# Applying the changes

If there's a command for formatting patches, there must be one for applying them. That's where `git apply` comes in. With the patch file in hand, it's as simple as:

```
git apply suggestions.patch --check && git apply suggestions.patch --index
```

By running a check before applying it, you prevent any nasty scenario where the patch doesn't fit your repository. Another key parameter when applying is `--index`, which prevents it from becoming a commit straight away. By having it in your index, you can test them and accept hunks with `git add -p`. However, I recommend using your IDE at this point because editing hunks by hand isn't trivial 😅

# Why would I use it?

The workflow isn't as elegant as sending a comment on a PR and letting the owner accept it, but it might be helpful in a few scenarios:

- Cascading changes: make it easier for the author to accept multiple changes for a single subject
- Sending diffs without author: when you don't care about authorship and would let the other get credit for those small changes
- Preventing the forge to block your contributions: connected to before, sometimes the forge blocks you from approving just because you committed a single line, contributing outside of the forge skips that (GitLab 👀)
- Porting commits between repositories: setting multiple remotes for a couple of commits isn't always the smoothest path
