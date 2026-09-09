import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { queryKepco } from '../common/js/kepco-query.mjs';
if (!process.env.KEPCO_API_KEY) throw new Error('KEPCO_API_KEY 환경변수가 필요합니다.');
const assets = {'/':['index.html','text/html; charset=utf-8'],'/style.css':['style.css','text/css'],'/script.js':['script.js','text/javascript']};
http.createServer(async (req,res) => {
  const send = (status,body,type='application/json') => {res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);};
  if (req.method === 'POST' && req.url === '/api/admin/kepco-test') {
    if (req.headers.origin && req.headers.origin !== 'http://127.0.0.1:8772') return send(403,'{}');
    let raw='';
    for await (const chunk of req) {raw+=chunk;if(raw.length>4096)return send(413,'{}');}
    try {const result=await queryKepco(JSON.parse(raw),process.env.KEPCO_API_KEY);return send(result.status,JSON.stringify(result.body));}catch{return send(400,'{"message":"입력 오류"}');}
  }
  const asset=assets[req.url];
  if(req.method!=='GET'||!asset)return send(404,'{}');
  send(200,await readFile(new URL('../admin/kepco-test/'+asset[0],import.meta.url)),asset[1]);
}).listen(8772,'127.0.0.1',()=>console.log('한전 테스트 페이지: http://127.0.0.1:8772'));
