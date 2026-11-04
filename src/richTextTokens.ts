// Tokenizer shared by the KaTeX renderer (richText.tsx) and the TikZ exporter, so
// both read the same string the same way.
//
// Splits on: $$display$$ / $inline$ math, plus <code>/<strong>/<em> markup.
// Math bodies allow escaped chars (e.g. \$ for the "sampled uniformly" arrow),
// so an escaped dollar never terminates the delimiter early.
export const RICH_TEXT_TOKEN_RE =
  /(\$\$(?:\\.|[^$\\])+\$\$|\$(?:\\.|[^$\\])+\$|<code>.*?<\/code>|<strong>.*?<\/strong>|<em>.*?<\/em>)/g;
