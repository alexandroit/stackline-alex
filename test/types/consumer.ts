import alex, {markdown, mdx, html, text, type OptionsObject} from '../../index.js'
import type {VFile} from 'vfile'

const options: OptionsObject = {
  allow: ['her-him'],
  noBinary: true,
  profanitySureness: 1
}
const results: VFile[] = [
  alex('A document.', options),
  markdown('# Heading', ['her-him']),
  mdx('<Component>Hello</Component>'),
  html('<p>A document.</p>'),
  text('A document.')
]
for (const result of results) {
  const count: number = result.messages.length
  void count
}
// @ts-expect-error: the public profanity threshold remains the 0 | 1 | 2 union.
text('A document.', {profanitySureness: 3})
