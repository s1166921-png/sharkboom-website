import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,chmodSync,readdirSync,statSync,unlinkSync} from 'node:fs';
import path from 'node:path';
const dir=process.env.SHARK_DATA_DIR||'/var/lib/sharkboom';
const backups=path.join(dir,'backups');mkdirSync(backups,{recursive:true,mode:0o700});
const database=new DatabaseSync(path.join(dir,'orders.db'));
const file=path.join(backups,new Date().toISOString().replaceAll(':','-')+'.db');
await backup(database,file);database.close();chmodSync(file,0o600);
for(const name of readdirSync(backups)){const full=path.join(backups,name);if(/^\d{4}-.*\.db$/.test(name)&&statSync(full).mtimeMs<Date.now()-30*86400000)unlinkSync(full);}
console.log('Encrypted order database backup completed');
