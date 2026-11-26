import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Usage: node apply-live-patch.mjs shell|projects exact-live-module.mjs output.mjs
const [kind, input, output] = process.argv.slice(2);
const expected = {
  shell:'480ab6555863341421cd60fc8e60943ed1ed05870c20bb84dfe249259ba6ff89',
  projects:'cb01c954b0cd7094fe1908f8440d7ee220a3f746a170d41abc81bbad107aff4b'
};
if (!expected[kind] || !input || !output) throw new Error('Provide shell|projects, the verified live module, and an output path.');
const original = readFileSync(input,'utf8');
const hash = createHash('sha256').update(original).digest('hex');
if (hash !== expected[kind]) throw new Error('Live source changed. Reconcile against the newer deployed version before applying this patch.');
let result = original;
function once(before,after) {
  if (result.split(before).length !== 2) throw new Error('Expected exactly one insertion point.');
  result = result.replace(before,after);
}
if (kind === 'shell') {
  once('    const url = new URL(request.url);','    const url = new URL(request.url);\n    const documentResponse = psrDocumentResponse(request);\n    if (documentResponse) return documentResponse;');
  once('    return rw.transform(response);','    return psrDocumentNavigation(request, rw.transform(response));');
  result = 'import { psrDocumentResponse } from "./public-documents.mjs";\nimport { psrDocumentNavigation } from "./document-navigation.mjs";\n' + result;
} else {
  once('return new HTMLRewriter()','return psrDocumentNavigation(request, new HTMLRewriter()');
  once('.transform(response);','.transform(response));');
  result = 'import { psrDocumentNavigation } from "./document-navigation.mjs";\n' + result;
}
writeFileSync(output,result);
console.log(JSON.stringify({output,sourceSha256:hash,outputSha256:createHash('sha256').update(result).digest('hex')}));
