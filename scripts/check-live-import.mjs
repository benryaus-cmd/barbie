import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import ts from 'typescript';
const release=JSON.parse(await readFile('docs/import-release.json','utf8'));
const code=ts.transpileModule(await readFile('vite-plugin-github-import.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {githubImportPlugin}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const root=await mkdtemp(path.join(tmpdir(),'dreamland-live-import-'));
try {
 await mkdir(path.join(root,'src/config'),{recursive:true});
 await writeFile(path.join(root,'package.json'),await readFile('package.json'));
 await writeFile(path.join(root,'src/App.tsx'),'old source');
 await writeFile(path.join(root,'src/main.tsx'),'host entry sentinel');
 await writeFile(path.join(root,'src/config/assets.json'),JSON.stringify({unrelated_radio:'preserve-this'}));
 await writeFile(path.join(root,'github-import.config.json'),JSON.stringify({...release,enabled:true,mode:'manifest',repository:'benryaus-cmd/barbie'}));
 await githubImportPlugin().config({root},{command:'build',mode:'production'});
 const manifest=JSON.parse(await readFile('aippy-import-manifest.json','utf8'));
 for(const entry of manifest.files) {
  const data=await readFile(path.join(root,entry.destination));
  assert.equal(data.length,entry.size);assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256);
 }
 const assets=JSON.parse(await readFile(path.join(root,'src/config/assets.json')));
 assert.equal(assets.unrelated_radio,'preserve-this');
 const expected=JSON.parse(await readFile('src/config/assets.json'));
 for(const key of manifest.assetConfigUpdate.keys) assert.equal(assets[key],expected[key]);
 assert.equal(await readFile(path.join(root,'src/main.tsx'),'utf8'),'host entry sentinel');
 await writeFile(path.join(root,'src/App.tsx'),'later host edit');
 await githubImportPlugin().config({root},{command:'build',mode:'production'});
 assert.equal(await readFile(path.join(root,'src/App.tsx'),'utf8'),'later host edit');
 const receipt=JSON.parse(await readFile(path.join(root,'.github-import-state/receipt.json')));
 assert.equal(receipt.sourceCommit,release.sourceCommit);
 await writeFile('.test-output/live-import-result.json',JSON.stringify({passed:true,sourceCommit:release.sourceCommit,manifestSha256:release.manifestSha256,verifiedGameFiles:manifest.files.length,verifiedAssetKeys:manifest.assetConfigUpdate.keys.length,unrelatedAssetPreserved:true,entryPreserved:true,repeatPreservedLocalEdit:true},null,2));
 console.log(`PASS: live commit-pinned GitHub import, all${manifest.files.length} files verified, ten asset keys, unrelated asset and host entry preserved, repeated request preserves later edits.`);
} finally {await rm(root,{recursive:true,force:true})}
