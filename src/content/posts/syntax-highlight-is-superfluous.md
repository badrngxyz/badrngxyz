---
date: 9999-12-31
title: Syntax Highlighting is superfluous
subtitle: If you format your code!
---

I've been having issues with treesitter since neovim updated to v0.12, and yesterday I had to fix a bug without a single color in my editor 🥲 A friend of mine joked I should put it on LinkedIn, and it made me question: what made it not so unbereable?

# Break the lines!

That's it, no need to read the rest ✅ I'm no outstanding developer that know language by heart, and I'm sure there are studies on the reading benefits of syntax highlighting. Regardless, I feel it all boils down to one thing: long lines. Even with syntax highlighthing, those get harder to read the more you pack into a string of concepts.

Measuring code readability is very nuanced. It depends on different familiarities and preferences. What I'd consider a readable if statement might not be for you because you group conditions differently from me. There's no "right way to read code", we process text information the way works best for each one of us, but I'd argue: the longer the lines, the harder it's is to reason about them.

- Reading haskell with its grouping rules (even a small line has many concepts)
- Idea from clean code around naming your fragments in a conditional (separating the logic concepts from business concepts)
- Method chaining in multiple lines vs split by each call/purpose
- Could I draw a comparison with English itself to drive the point home better?
- Is there any study I can refer too? Could I ask for that in the end? It'd be an explicit ask for feedback 🤘
