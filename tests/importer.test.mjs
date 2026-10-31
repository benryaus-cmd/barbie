import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const code=ts.transpileModule(await readFile('vite-plugin-github-import.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {githubImportPlugin}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const hash=b=>createHash('sha256').update(b).digest('hex');
test('manifest transaction verifies bytes, merges assets, preserves host, and skips completed request',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'dream-import-'));
 const base='https://raw.githubusercontent.com/benryaus-cmd/barbie/'+ 'a'.repeat(40)+'/';
 const files=new Map([['src/App.tsx',Buffer.from('new app')],['public/sample.bin',Buffer.from([0,1,255,128])],['src/config/assets.json',Buffer.from('{"music":"new-url"}')]]);
 const entry=destination=>({destination,url:base+destination,size:files.get(destination).length,sha256:hash(files.get(destination))});
 const manifest={schemaVersion:1,repository:'benryaus-cmd/barbie',sourceCommit:'a'.repeat(40),files:[entry('src/App.tsx'),entry('public/sample.bin')],assetConfigUpdate:{...entry('src/config/assets.json'),strategy:'merge-json-object',keys:['music']},requiredDependencies:{react:'^19.2.8'},obsoleteGameFiles:[]};
 const manifestUrl='https://raw.githubusercontent.com/benryaus-cmd/barbie/'+ 'b'.repeat(40)+'/aippy-import-manifest.json';
 const config={enabled:true,mode:'manifest',repository:manifest.repository,sourceCommit:manifest.sourceCommit,requestId:'test-v1',manifestUrl};
 const configure=async()=>{const body=Buffer.from(JSON.stringify(manifest));config.manifestSha256=hash(body);await writeFile(path.join(root,'github-import.config.json'),JSON.stringify(config));return body};
 await mkdir(path.join(root,'src/config'),{recursive:true});await writeFile(path.join(root,'src/App.tsx'),'old app');await writeFile(path.join(root,'src/config/assets.json'),'{"music":"old-url","radio":"keep-me"}');await writeFile(path.join(root,'package.json'),'{"dependencies":{"react":"^19.2.8"}}');
 let body=await configure(),requests=0;
 const original=globalThis.fetch;globalThis.fetch=async url=>{requests++;const data=url===manifestUrl?body:files.get(String(url).slice(base.length));assert(data,'URL must be an explicit pinned file');return new Response(data)};
 const run=()=>githubImportPlugin().config({root},{command:'build',mode:'production'});
 try {
  manifest.files[1].sha256='0'.repeat(64);body=await configure();await assert.rejects(run(),/staging failed/);assert.equal(await readFile(path.join(root,'src/App.tsx'),'utf8'),'old app');
  manifest.files[1]=entry('public/sample.bin');body=await configure();await run();assert.equal(await readFile(path.join(root,'src/App.tsx'),'utf8'),'new app');assert.deepEqual(await readFile(path.join(root,'public/sample.bin')),files.get('public/sample.bin'));assert.deepEqual(JSON.parse(await readFile(path.join(root,'src/config/assets.json'))),{music:'new-url',radio:'keep-me'});
  await writeFile(path.join(root,'src/App.tsx'),'later Aippy edit');const count=requests;await run();assert.equal(requests,count);assert.equal(await readFile(path.join(root,'src/App.tsx'),'utf8'),'later Aippy edit');
  config.requestId='unsafe';manifest.files.push({...entry('src/App.tsx'),destination:'src/../escaped.ts'});body=await configure();await assert.rejects(run(),/unsafe destination/);
 } finally {globalThis.fetch=original;await rm(root,{recursive:true,force:true})}
});
