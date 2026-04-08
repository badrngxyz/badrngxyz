---
date: 2026-04-15
title: Sending suggestions outside GitHub
description: The ancient ways are still useful
---

There are many reasons one might want to send suggestions outside of GitHub. Be it because your suggestion is too big, maybe a whole overhaul of the project, or you simply don't want to commit another person's branch. Git started without GitHub, and it's built on top of sending changes around, so why bounding ourselves to a mere UI when we can whip out the mighty CLI 💪🧨

# Extracting the changes

Suggestions are basically a diff, but you gotta present them for another person to analyze. Before your coworker can see you changes, you gotta first make them somewhere to extract them later. The beauty of working with diffs directly is you can use your local toolchain. Let's say your buddy wants a review on `awesome-feature`:

```sh
git switch main
git fetch
git switch awesome-feature
git switch -c awesome-suggestions
# do your changes
git commit "suggestions from your pal"
```

We create a separate branch just to make things easier if they move in the meantime. Now we have to package that patch and send it over the wire. Git works based on patches, so it's natural there's already a command for it 🎉

```sh
git format-patch awesome-feature..awesome-suggestions --stdout > suggestions.patch
```

Now it's just a matter of sending that file over to your coworker however you prefer.

# Applying the changes

If there's a command for formatting patches, there has to be one for applying patches. That's where `git apply` comes in. With the patch file in hand, it's as simple as:

```
git apply suggestions.patch --check && git apply --sugestions.patch --index
```

By running a check before applying it you prevent any nasty scenario where the patch doesn't fit your repository. Another key parameter when applying is `--index` for it to not become a commit straight away. By having it in your index, it's possible to test it and accept hunks with `git add -p`. However, I recommend using your IDE at this point because editing hunk by hand isn't trivial 😅

# Why would I use it?

The flow isn't as pretty as sending a comment over a PR and letting the owner accept it, but it might help in a few scenarios:

- Cascading changes: prevent multiple changes for the same subject from getting folded and ignored 🙃
- Sending diffs without author: when you don't care about authorship and would let the other get credits over those small changes
- Porting commits between repositories: setting multiple remotes for a couple commits isn't always the smoothest path
