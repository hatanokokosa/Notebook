---
title: Hello, World!
---

# Upmath: Math Online Editor
_Create web articles and&nbsp;blog posts with&nbsp;equations and&nbsp;diagrams_

Upmath significantly simplifies this task by using Markdown and LaTeX. It converts Markdown syntax extended with LaTeX equations support into HTML code you can publish anywhere on the web.

## Markdown

Definition from [Wikipedia](https://en.wikipedia.org/wiki/Markdown):

> Markdown is a lightweight markup language with plain text formatting syntax designed so that it can be converted to HTML and many other formats using a tool by the same name. Markdown is often used to format readme files, for writing messages in online discussion forums, and to create rich text using a plain text editor.

The main idea of Markdown is to use a simple plain text markup. It's ~~hard~~ easy to __make__ **bold** _or_ *italic* text. Simple equations can be formatted with subscripts and superscripts: *E*~0~=*mc*^2^. I have added the LaTeX support: $$E_0=mc^2$$.

Among Markdown features are:

* images (see above);
* links: [service main page](/ "link title");
* code: `untouched equation source is *E*~0~=*mc*^2^`;
* unordered lists--when a line starts with `+`, `-`, or `*`;
  1. sub-lists
  1. and ordered lists too;
* direct use <nobr>of HTML</nobr>&ndash;for <span style="color: red">anything else</span>. 

In addition, Upmath supports typographic replacements: (c) (r) (tm) +- !!!!!! ???? ,,  -- ---

## LaTeX

$$
x_{1,2} = {-b\pm\sqrt{b^2 - 4ac} \over 2a}
$$

In this case the LaTeX syntax will be highlighted in the source code. You can even add equation numbers (unfortunately there is no automatic numbering and refs support):

$$
|\vec{A}|=\sqrt{A_x^2 + A_y^2 + A_z^2}
$$

It is possible to write Cyrillic symbols in `\text` command: $$Q_\text{плавления}>0$$.

One can use matrices:

$$
T^{\mu\nu}=\begin{pmatrix}
\varepsilon&0&0&0\\
0&\varepsilon/3&0&0\\
0&0&\varepsilon/3&0\\
0&0&0&\varepsilon/3
\end{pmatrix}
$$

integrals:

$$
P_\omega={n_\omega\over 2}\hbar\omega\,{1+R\over 1-v^2}\int\limits_{-1}^{1}dx\,(x-v)|x-v|
$$

and [the rest of LaTeX features](https://en.wikibooks.org/wiki/LaTeX/Mathematics).

## About Upmath

* Upmath works in browsers, except equations rendered [on the server](//i.upmath.me/). Markdown text is not sent anywhere, and attackers cannot intercept it.
* Upmath stores your text in the browser to prevent the loss of your work in case of software or hardware failures.
* You can create and switch between multiple documents via the "☰ &rarr; New" and "☰ &rarr; Open" menu.
* Upmath occasionally saves intermediate versions of your texts. They can be restored via the "☰ &rarr; Restore from history" menu.
* You can copy or download the text ("☰ &rarr; Download source") and the converted code ("⇓" button).
* To print or convert your documents to PDF, use the standard browser print dialog or the "☰ &rarr; Print or save PDF" menu.

I have designed and developed this lightweight editor and the service for converting LaTeX equations into SVG pictures to make publishing mathematical  texts on the web easy. I consider client-side rendering, the rival technique implemented in [MathJax](https://www.mathjax.org/), to be too limited and resource-consuming, especially on mobile devices.

The source code is [published on Github](https://github.com/parpalak/upmath.me) under MIT license.

***

Now you can erase this instruction and start writing your own scientific post. If you wish to see the instruction again, use the "☰ &rarr; Open instruction" menu.

Have a nice day :)

[Roman Parpalak](https://parpalak.com/), web developer and UX expert.
