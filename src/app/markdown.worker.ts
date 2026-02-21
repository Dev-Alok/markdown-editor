/// <reference lib="webworker" />

import './prism-config';

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
            try {
                const language = (lang && Prism.languages[lang]) ? lang : null;
                if (language) {
                    return Prism.highlight(code, Prism.languages[language], language);
                }
                return code;
            } catch {
                return code;
            }
        }
    })
);

markedInstance.setOptions({
    gfm: true,
    breaks: true,
});

addEventListener('message', async ({ data }) => {
    let parsedData = data;
    if (typeof data === 'string') {
        try {
            parsedData = JSON.parse(data);
        } catch {
            return;
        }
    }

    if (!parsedData || typeof parsedData !== 'object') {
        return;
    }

    const { content, id } = parsedData;
    if (typeof content !== 'string') {
        return;
    }

    try {
        const html = await markedInstance.parse(content);
        postMessage(JSON.stringify({
            html: html.toString(),
            id: Number(id)
        }));
    } catch (error) {
        postMessage(JSON.stringify({
            html: '<p>Error parsing markdown</p>',
            id: Number(id),
            error: String(error)
        }));
    }
});
