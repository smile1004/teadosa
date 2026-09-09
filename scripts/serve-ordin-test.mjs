import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {queryOrdin} from '../common/js/ordin-query.mjs';
const assets=new Map([['/test2','test2.html'],['/test2.html','test2.html'],['/admin/kepco-test/style.css','admin/kepco-test/style.css'],['/admin/ordin-test/style.css','admin/ordin-test/style.css'],['/admin/ordin-test/script.js','admin/ordin-test/script.js']]);
http.createServer(async(req,res)=>{
  const send=(status,value,type='application/json')=>{res.writeHead(status,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(value);};
  try{
    if(req.method==='POST'&&req.url==='/api/admin/ordin-test'){
      if(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:8773')return send(403,'{}');
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)return send(413,'{}');}
      let input;try{input=JSON.parse(raw);}catch{return send(400,JSON.stringify({message:'입력 형식 오류'}));}
      const result=await queryOrdin(input,process.env.LAW_API_OC);return send(result.status,JSON.stringify(result.body));
    }
    const file=assets.get(req.url);if(req.method!=='GET'||!file)return send(404,'{}');
    send(200,await readFile(new URL('../'+file,import.meta.url)),file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');
  }catch{send(500,JSON.stringify({message:'로컬 서버 오류'}));}
}).listen(8773,'127.0.0.1',()=>console.log('조례 테스트: http://127.0.0.1:8773/test2 (LAW_API_OC '+(process.env.LAW_API_OC?'설정됨':'미설정')+')'));
