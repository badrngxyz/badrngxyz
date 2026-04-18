---
date: 9999-12-31
title: Syntax Highlighting is superfluous
subtitle: If you format your code!
---

I've been having issues with treesitter since neovim updated to v0.12, and yesterday I had to fix a bug without a single color in my editor 🥲 I didn't consider it too painful, but a friend joked I should share on LinkedIn 😆 which made me question: what made it not so unbereable? The bug wasn't neither too difficult nor too simple, and spanned multiple files (which I couldn't jump to definition because the LSP broke too 🫠), so there was something else 🤔

# Break the lines!

That's it, no need to read the rest ✅ I'm no outstanding Elixir developer, and I'm sure there are studies on the reading benefits of syntax highlighting. Regardless, I feel it all boils down to one thing: long lines. Even with syntax highlighthing, those get harder to read the more concepts you pack into a string calls. Because Elixir has the pipeline operator, and the formatter splits each phase into lines, long oneline chains of calls don't appear often.

Measuring code readability is very nuanced. It depends on different familiarities and preferences. What I'd consider a readable if statement might not be for you because you group conditions differently from me. There's no "right way to read code", we process text information the way works best for each one of us, but I'd argue: the longer the lines, the harder it's is to reason about them.

- Could I draw a comparison with English itself to drive the point home better?
  - A bunch of really long lines (breaking the container and stretching the whole screen) vs them in smaller form
- One liner from my friend with multiple environments in it #break-the-environments
  - `pnpm --silent workspaces info | bun -p "Object.keys(JSON.parse(require('fs').readFileSync(0,'utf8'))).sort().join('\n')" | uniq > packages.txt`
  - That first iteraction with Lumo for the awk script on the multiple keys post where awk was doing bash work indirectly
- Idea from clean code around naming your fragments in a conditional (separating the logic concepts from business concepts) #reduce-the-switches
- Reading haskell with its grouping rules (even a small line has many concepts) #make-it-linear
  - Linear code is better - there's a post about this that I highlighted in the past 🥳
  - Infix operators vs normal function chaining with pipelines (if possible)
    - Code that looks beautiful isn't necessarily more readable. The point is not being smart or beautiful, but communicating intent!
  - Free point (free dot, whatever that method of omitting parameters because the composition expects them) is really better?
- Method chaining in multiple lines vs split by each call/purpose #break-the-lines
- Is there any study I can refer too? Could I ask for that in the end? It'd be an explicit ask for feedback 🤘
