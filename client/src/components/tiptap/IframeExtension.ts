import { Node, mergeAttributes } from '@tiptap/core';

export interface IframeOptions {
    allowFullscreen: boolean;
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        iframe: {
            /**
             * Add an iframe (embed) to the editor
             */
            setIframe: (options: { src: string; width?: string; height?: string }) => ReturnType;
        };
    }
}

/**
 * TipTap Iframe Extension
 * 
 * Allows embedding iframes (like Facebook videos, YouTube, etc.) directly into the editor content.
 * The iframe is rendered as a block element with responsive sizing.
 */
export const IframeExtension = Node.create<IframeOptions>({
    name: 'iframe',

    group: 'block',

    atom: true,

    addOptions() {
        return {
            allowFullscreen: true,
            HTMLAttributes: {
                class: 'iframe-embed',
                style: 'border: none; overflow: hidden; max-width: 100%; display: block; margin: 1rem auto;',
            },
        };
    },

    addAttributes() {
        return {
            src: {
                default: null,
                parseHTML: element => element.getAttribute('src'),
            },
            width: {
                default: '100%',
                parseHTML: element => element.getAttribute('width') || '100%',
            },
            height: {
                default: '476',
                parseHTML: element => element.getAttribute('height') || '476',
            },
            frameborder: {
                default: '0',
                parseHTML: element => element.getAttribute('frameborder') || '0',
            },
            scrolling: {
                default: 'no',
                parseHTML: element => element.getAttribute('scrolling') || 'no',
            },
            allowfullscreen: {
                default: true,
                parseHTML: element => element.hasAttribute('allowfullscreen'),
            },
            allow: {
                default: 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share',
                parseHTML: element => element.getAttribute('allow'),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'iframe',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            { class: 'iframe-wrapper', style: 'position: relative; max-width: 100%; margin: 1rem 0; text-align: center;' },
            [
                'iframe',
                mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                    allowfullscreen: this.options.allowFullscreen ? 'true' : undefined,
                }),
            ],
        ];
    },

    addCommands() {
        return {
            setIframe:
                (options) =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                            attrs: options,
                        });
                    },
        };
    },
});

/**
 * Parse an iframe HTML string and extract attributes
 */
export function parseIframeHtml(htmlString: string): { src: string; width: string; height: string } | null {
    // Create a temporary DOM element to parse the HTML
    const template = document.createElement('template');
    template.innerHTML = htmlString.trim();

    const iframe = template.content.querySelector('iframe');
    if (!iframe) {
        return null;
    }

    return {
        src: iframe.getAttribute('src') || '',
        width: iframe.getAttribute('width') || '100%',
        height: iframe.getAttribute('height') || '476',
    };
}
