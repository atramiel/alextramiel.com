# alextramiel.com

Portfolio and blog, built with [Astro](https://astro.build). Content is Markdown; pushing to `main` deploys the site.

## Add a blog post

Create `src/content/posts/my-post.md`:

```md
---
title: My post
description: One line that shows in the post list.
date: 2026-12-01
tags: [robots]
---

Write here in Markdown.
```

The file name becomes the address: `/writing/my-post/`. Add `draft: true` to keep a post off the site.

## Add a project

Create `src/content/projects/my-project.md`:

```md
---
title: My project
summary: One sentence that shows in the work index.
group: Robots          # Work, Robots, or Home and shop
years: "2026"           # optional
role: Builder          # optional
tools: [Onshape]       # optional
links:                 # optional
  - label: Source
    url: https://github.com/example/repo
order: 35              # lower numbers list first
---
```

## Photos

Put images next to the Markdown file (or in a folder beside it) and reference them with a relative path:

```md
![Robot on the bench](./robot-bench.jpg)
```

For a large image at the top of a project or post, add to the frontmatter:

```yaml
cover: ./robot-bench.jpg
coverAlt: Robot on the bench
```

Astro resizes and compresses them during the build.

## Run it locally

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # output in dist/
```

## Where things are

- `src/site.ts`: name, description, footer links
- `src/content/`: projects and posts
- `src/pages/`: home, work, writing, about
- `src/styles/global.css`: colors and type
- `.github/workflows/deploy.yml`: GitHub Pages deploy
- `public/CNAME`: custom domain for GitHub Pages

## Secrets

All of the interactive code is in `src/scripts/board.ts`. There are five hidden things:

| Secret | How to find it |
| --- | --- |
| Bot Hockey | Konami code (up up down down left right left right B A), type `hockey`, or click the gold test point in the footer |
| Route the trace (snake) | Type `snake`, or click the chip in the footer |
| Magic smoke | Click the capacitor in the footer five times |
| Weapon test | Type `fight` |
| Power switch | Flip the switch in the header to power the board down |

Clicking the big name on the home page cycles the oscilloscope between sine, square and sawtooth. The browser console prints a hint.
