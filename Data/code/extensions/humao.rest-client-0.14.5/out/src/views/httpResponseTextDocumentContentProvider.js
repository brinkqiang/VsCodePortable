"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const baseTextDocumentContentProvider_1 = require("./baseTextDocumentContentProvider");
const mimeUtility_1 = require("../mimeUtility");
const responseFormatUtility_1 = require("../responseFormatUtility");
const responseStore_1 = require("../responseStore");
const Constants = require("../constants");
const path = require("path");
const hljs = require('highlight.js');
var autoLinker = require('autolinker');
class HttpResponseTextDocumentContentProvider extends baseTextDocumentContentProvider_1.BaseTextDocumentContentProvider {
    constructor(settings) {
        super();
        this.settings = settings;
    }
    provideTextDocumentContent(uri) {
        if (uri) {
            let response = responseStore_1.ResponseStore.get(uri.toString());
            if (response) {
                let innerHtml;
                let width = 2;
                let contentType = response.getResponseHeaderValue("content-type");
                if (contentType) {
                    contentType = contentType.trim();
                }
                if (contentType && mimeUtility_1.MimeUtility.isBrowserSupportedImageFormat(contentType)) {
                    innerHtml = `<img src="data:${contentType};base64,${new Buffer(response.bodyStream).toString('base64')}">`;
                }
                else {
                    let code = this.highlightResponse(response);
                    width = (code.split(/\r\n|\r|\n/).length + 1).toString().length;
                    innerHtml = `<pre><code>${this.addLineNums(code)}</code></pre>`;
                }
                return `
            <head>
                <link rel="stylesheet" href="${HttpResponseTextDocumentContentProvider.cssFilePath}">
                ${this.getSettingsOverrideStyles(width)}
            </head>
            <body>
                <div>
                    ${this.addUrlLinks(innerHtml)}
                    <a id="scroll-to-top" role="button" aria-label="scroll to top" onclick="scroll(0,0)"><span class="icon"></span></a>
                </div>
            </body>`;
            }
        }
    }
    highlightResponse(response) {
        let code = '';
        let nonBodyPart = `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}
${HttpResponseTextDocumentContentProvider.formatHeaders(response.headers)}`;
        code += hljs.highlight('http', nonBodyPart + '\r\n').value;
        let contentType = response.getResponseHeaderValue("content-type");
        let bodyPart = `${responseFormatUtility_1.ResponseFormatUtility.FormatBody(response.body, contentType)}`;
        let bodyLanguageAlias = HttpResponseTextDocumentContentProvider.getHighlightLanguageAlias(contentType);
        if (bodyLanguageAlias) {
            code += hljs.highlight(bodyLanguageAlias, bodyPart).value;
        }
        else {
            code += hljs.highlightAuto(bodyPart).value;
        }
        return code;
    }
    getSettingsOverrideStyles(width) {
        return [
            '<style>',
            'code {',
            this.settings.fontFamily ? `font-family: ${this.settings.fontFamily};` : '',
            this.settings.fontSize ? `font-size: ${this.settings.fontSize}px;` : '',
            this.settings.fontWeight ? `font-weight: ${this.settings.fontWeight};` : '',
            '}',
            'code .line {',
            `padding-left: calc(${width}ch + 18px );`,
            '}',
            'code .line:before {',
            `width: ${width}ch;`,
            `margin-left: calc(-${width}ch + -27px );`,
            '}',
            '</style>'
        ].join('\n');
    }
    addLineNums(code) {
        code = code.replace(/([\r\n]\s*)(<\/span>)/ig, '$2$1');
        code = this.cleanLineBreaks(code);
        code = code.split(/\r\n|\r|\n/);
        let max = (1 + code.length).toString().length;
        code = code
            .map(function (line, i) {
            return '<span class="line width-' + max + '" start="' + (1 + i) + '">' + line + '</span>';
        })
            .join('\n');
        return code;
    }
    cleanLineBreaks(code) {
        let openSpans = [], matcher = /<\/?span[^>]*>|\r\n|\r|\n/ig, newline = /\r\n|\r|\n/, closingTag = /^<\//;
        return code.replace(matcher, function (match) {
            if (newline.test(match)) {
                if (openSpans.length) {
                    return openSpans.map(function () { return '</span>'; }).join('') + match + openSpans.join('');
                }
                else {
                    return match;
                }
            }
            else if (closingTag.test(match)) {
                openSpans.pop();
                return match;
            }
            else {
                openSpans.push(match);
                return match;
            }
        });
    }
    addUrlLinks(innerHtml) {
        return innerHtml = autoLinker.link(innerHtml, {
            urls: {
                schemeMatches: true,
                wwwMatches: true,
                tldMatches: false
            },
            email: false,
            phone: false,
            stripPrefix: false,
            stripTrailingSlash: false
        });
    }
    static formatHeaders(headers) {
        let headerString = '';
        for (var header in headers) {
            if (headers.hasOwnProperty(header)) {
                let value = headers[header];
                if (typeof headers[header] !== 'string') {
                    value = headers[header];
                }
                headerString += `${header}: ${value}\n`;
            }
        }
        return headerString;
    }
    static getHighlightLanguageAlias(contentType) {
        if (!contentType) {
            return null;
        }
        contentType = contentType.toLowerCase();
        let mime = mimeUtility_1.MimeUtility.parse(contentType);
        let type = mime.type;
        let suffix = mime.suffix;
        if (type === 'application/json' || suffix === '+json') {
            return 'json';
        }
        else if (type === 'application/javascript') {
            return 'javascript';
        }
        else if (type === 'application/xml' || type === 'text/xml' || suffix === '+xml') {
            return 'xml';
        }
        else if (type === 'text/html') {
            return 'html';
        }
        else {
            return null;
        }
    }
}
HttpResponseTextDocumentContentProvider.cssFilePath = path.join(vscode_1.extensions.getExtension(Constants.ExtensionId).extensionPath, Constants.CSSFolderName, Constants.CSSFileName);
exports.HttpResponseTextDocumentContentProvider = HttpResponseTextDocumentContentProvider;
//# sourceMappingURL=httpResponseTextDocumentContentProvider.js.map