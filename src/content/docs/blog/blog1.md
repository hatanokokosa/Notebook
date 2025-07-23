---
title: Blog Eg
date: 2025-07-15
lastUpdated: 2025-07-15
tags:
  - Eg
  - Blog
excerpt: The title of the blog post which will be displayed at the top of the page and in the blog post list...
---

## title

Required
Type: string

The title of the blog post which will be displayed at the top of the page and in the blog post list.
```
---
title: A blog post
---
```
## date

Required
Type: Date

The date of the blog post which must be a valid YAML timestamp. Posts are sorted by descending date in the blog post list.
```
---
date: 2024-03-11
---
```

## lastUpdated

Type: Date | boolean

If a date is specified in a blog post for this Starlight frontmatter field, such date will also be displayed next to the blog post date.

Displayed only if different from the date frontmatter field and must be a valid YAML timestamp.
```
---
lastUpdated: 2024-07-01
---
```
## tags

Type: string[]

A list of tags associated with the blog post displayed at the bottom of a blog post and in the blog post list.
```
---
tags:
  - Tag
  - Another tag
---
```
## excerpt

Type: string

The excerpt of the blog post used in the blog post list, authors, and tags pages which supports basic Markdown formatting.
```
---
excerpt: A small excerpt of the blog post…
---
```
If not provided, excerpt delimiters will be used if present in the blog post content or the entire blog post content will be rendered otherwise. To learn more about excerpts, check the “Excerpts” guide.
## authors

Type: StarlightBlogAuthorsConfig

The author(s) of the blog post. Check the “Authors” guide for more informations.
```
---
authors:
  - Bob
---
```
## featured

Type: boolean
Default: false

Set whether this blog post should be considered featured. Featured blog posts are listed at the top of the sidebar in a dedicated “Featured posts” group.

The featured group is displayed only if at least one blog post is marked as featured. If a blog post is featured and also recent, it will be displayed only in the featured group.
```
---
featured: true
---
```
## draft

Type: boolean
Default: false

Set whether this blog post should be considered a draft and not be included in production builds. Set to true to mark a blog post as a draft and make it only visible during development.
```
---
draft: true
---
```
## cover

Type: CoverConfig

Add a cover image to the top of the blog post.
```
---
cover:
  alt: A beautiful cover image
  image: ../../../assets/cover.png
---
```
You can display different versions of the cover image in dark and light modes.
```
---
cover:
  alt: Beautiful cover images
  dark: ../../../assets/cover-dark.png
  light: ../../../assets/cover-light.png
---
```
## CoverConfig
```
type CoverConfig =
  | {
      // Alternative text describing the cover image for assistive technologies.
      alt: string
      // Relative path to an image file in your project or URL to a remote image.
      image: string
    }
  | {
      // Alternative text describing the cover image for assistive technologies.
      alt: string
      // Relative path to an image file in your project or URL to a remote image
      // to use in dark mode.
      dark: string
      // Relative path to an image file in your project or URL to a remote image
      // to use in light mode.
      light: string
    }
```
## metrics

Override the computed metrics of the blog post.
readingTime

Type: number

The reading time of the blog post in seconds.
```
---
metrics:
  readingTime: 120 # 2 minutes
---
```
## words

Type: number

The word count of the blog post.
```
---
metrics:
  words: 1400
---
```