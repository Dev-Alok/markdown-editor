/// <reference lib="webworker" />

import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import * as Prism from 'prismjs';

import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';

const markedInstance = new Marked(
    markedHighlight({
        highlight(code, lang) {
            const language = Prism.languages[lang] ? lang : 'plaintext';
            return Prism.highlight(code, Prism.languages[language], language);
        }
    })
);

markedInstance.setOptions({
    gfm: true,
    breaks: true,
});

addEventListener('message', async ({ data }) => {
    // Basic validation to avoid any weird [object Object] parsing if someone passes something else
    if (!data || typeof data !== 'object') return;

    const { content, id } = data;
    if (typeof content !== 'string') return;

    try {
        const html = await markedInstance.parse(content);
        // Ensure we only post back basic serializable data
        postMessage({
            html: html.toString(),
            id: Number(id)
        });
    } catch (error) {
        postMessage({
            html: '<p>Error parsing markdown</p>',
            id: Number(id),
            error: String(error)
        });
    }
});
