import {mkdir,copyFile,readdir,writeFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(path.join(root,'public/wasm'),{recursive:true});
await mkdir(path.join(root,'public/models'),{recursive:true});
const wasm=path.join(root,'node_modules/@mediapipe/tasks-vision/wasm');
for(const name of await readdir(wasm)) await copyFile(path.join(wasm,name),path.join(root,'public/wasm',name));
for(const variant of ['lite','full']){
const model=path.join(root,`public/models/pose_landmarker_${variant}.task`);
if(!(await stat(model).catch(()=>null))){
 const response=await fetch(`https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${variant}/float16/1/pose_landmarker_${variant}.task`);
 if(!response.ok)throw new Error(`Model download failed: ${response.status}`);
 await writeFile(model,Buffer.from(await response.arrayBuffer()));
}
}
console.log('Local pose model and WASM assets are ready.');
