import {build} from 'esbuild';
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('.preview',{recursive:true});
await build({entryPoints:['preview/main.tsx'],outfile:'.preview/preview.js',bundle:true,format:'esm',platform:'browser',jsx:'automatic'});
writeFileSync('.preview/index.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pokémon PC — synthetic preview</title><link rel="stylesheet" href="preview.css"><div id="root"></div><script type="module" src="preview.js"></script></html>');
console.log('Synthetic preview built in .preview/. Serve locally; it never connects to BB.');
