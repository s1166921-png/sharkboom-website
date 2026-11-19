import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

if(!process.env.SITE_ORIGIN)throw new Error('Set SITE_ORIGIN to the complete website origin before building, for example https://sharkboom.example.com');
const origin=new URL(process.env.SITE_ORIGIN);
if(!['http:','https:'].includes(origin.protocol)||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash){
  throw new Error('SITE_ORIGIN must contain only an http(s) scheme and hostname, without a path, credentials, query or fragment');
}
const result=spawnSync(process.execPath,[fileURLToPath(new URL('./github-pages.mjs',import.meta.url))],{
  stdio:'inherit',
  env:{...process.env,STANDALONE_SITE:'true',GITHUB_PAGES_BASE_PATH:'',GITHUB_PAGES_ORIGIN:origin.origin},
});
if(result.error)throw result.error;
process.exit(result.status??1);
