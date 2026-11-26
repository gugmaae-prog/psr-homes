import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Usage: node apply-live-patch.mjs exact-live-worker.mjs output-worker.mjs
// Download and inspect the current production source before using this script.
const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Provide the verified live module and an output path.');
const original = readFileSync(input, 'utf8');
const expected = '3801ac9f5e145966ea1746190c688fc12d360ce7e789165b8d44179cfa58fd09';
const actual = createHash('sha256').update(original).digest('hex');
if (actual !== expected) throw new Error('Live source has changed. Reconcile the document patch with the new version before deployment.');
const before = '    const url = new URL(request.url);\n    if(retiredProfilePath(url.pathname))';
const after = '    const url = new URL(request.url);\n    const documentResponse = psrDocumentResponse(request);\n    if (documentResponse) return documentResponse;\n    if(retiredProfilePath(url.pathname))';
const returnBefore = 'return psrCleanRohitResponse(request, psrFinishHtml(request, await rewriteResponse(request, await upstreamFor(request, env).fetch(request), ctx)));';
const returnAfter = 'return psrDocumentNavigation(request, await psrCleanRohitResponse(request, psrFinishHtml(request, await rewriteResponse(request, await upstreamFor(request, env).fetch(request), ctx))));';
for (const needle of [before, returnBefore]) if (original.split(needle).length !== 2) throw new Error('Expected exactly one insertion point.');
const patched = 'import { psrDocumentResponse, psrDocumentNavigation } from "./public-documents.mjs";\n' + original.replace(before, after).replace(returnBefore, returnAfter);
writeFileSync(output, patched);
console.log(JSON.stringify({output, sourceSha256:actual, outputSha256:createHash('sha256').update(patched).digest('hex')}));
