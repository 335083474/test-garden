import http from 'node:http';
import fs from 'node:fs/promises';
import {Readable} from 'node:stream';
const worker=(await import('data:text/javascript;base64,'+(await fs.readFile(new URL('../dist/server/index.js',import.meta.url))).toString('base64'))).default;
const port=Number(process.env.PORT||4317);
http.createServer(async(req,res)=>{
 try{
  const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
  const result=await worker.fetch(request,{OPENAI_API_KEY:process.env.OPENAI_API_KEY,OPENAI_MODEL:process.env.OPENAI_MODEL});
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
 }catch{res.writeHead(500,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('Server error');}
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
