import type { Context } from 'hono';
import { html } from 'hono/html';
import type { Env } from '../models/types';

const AGENT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const USER_ID = 'elean-test-001';

export function handleChatUi(c: Context<{ Bindings: Env }>) {
  return c.html(html`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Zenith Factory</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--surface:#12121a;--border:#1e1e2e;--text:#e4e4ef;--muted:#6b6b80;--accent:#7c5cfc;--accent-dim:#5a3fd6;--user-bg:#1a1a2e;--bot-bg:#16162a;--input-bg:#16162a;--radius:12px}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;height:100vh;display:flex;flex-direction:column}
header{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;background:var(--surface)}
header .dot{width:10px;height:10px;border-radius:50%;background:#2d2d3d}
header .dot.live{background:#4ade80;box-shadow:0 0 8px #4ade8066}
header h1{font-size:15px;font-weight:600;letter-spacing:.5px}
header .status{margin-left:auto;font-size:12px;color:var(--muted)}
#messages{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px}
.msg{max-width:75%;padding:12px 16px;border-radius:var(--radius);font-size:14px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.msg.user{align-self:flex-end;background:var(--accent);color:#fff;border-bottom-right-radius:4px}
.msg.bot{align-self:flex-start;background:var(--bot-bg);border:1px solid var(--border);border-bottom-left-radius:4px}
.msg.bot .label{font-size:11px;color:var(--accent);font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
.msg.system{align-self:center;background:transparent;color:var(--muted);font-size:12px;padding:4px 12px}
.typing{display:inline-flex;gap:4px;padding:4px 0}
.typing span{width:6px;height:6px;border-radius:50%;background:var(--muted);animation:blink 1.4s infinite both}
.typing span:nth-child(2){animation-delay:.2s}
.typing span:nth-child(3){animation-delay:.4s}
@keyframes blink{0%,80%,100%{opacity:.3}40%{opacity:1}}
form{padding:16px 20px;border-top:1px solid var(--border);background:var(--surface);display:flex;gap:10px}
input{flex:1;background:var(--input-bg);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;color:var(--text);font-size:14px;outline:none;transition:border-color .2s}
input:focus{border-color:var(--accent)}
input::placeholder{color:var(--muted)}
button{background:var(--accent);border:none;border-radius:var(--radius);padding:12px 20px;color:#fff;font-size:16px;cursor:pointer;transition:background .2s;display:flex;align-items:center}
button:hover{background:var(--accent-dim)}
button:disabled{opacity:.4;cursor:not-allowed}
#messages::-webkit-scrollbar{width:6px}
#messages::-webkit-scrollbar-track{background:transparent}
#messages::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
</style>
</head>
<body>
<header>
  <div class="dot" id="statusDot"></div>
  <h1>Zenith Factory</h1>
  <span class="status" id="statusText">Connecting...</span>
</header>
<div id="messages"></div>
<form id="chatForm">
  <input id="prompt" placeholder="Escribí tu mensaje..." autocomplete="off" disabled>
  <button type="submit" id="sendBtn" disabled>&#10148;</button>
</form>
<script>
const AGENT_ID='${AGENT_ID}';
const USER_ID='${USER_ID}';
const BASE=location.origin;
const msgs=document.getElementById('messages');
const form=document.getElementById('chatForm');
const input=document.getElementById('prompt');
const btn=document.getElementById('sendBtn');
const dot=document.getElementById('statusDot');
const statusText=document.getElementById('statusText');
let threadId=null;
let ready=false;

function addMsg(text,type){
  const d=document.createElement('div');
  d.className='msg '+type;
  if(type==='bot')d.innerHTML='<div class="label">Agent</div>'+escapeHtml(text);
  else if(type==='system')d.textContent=text;
  else d.textContent=text;
  msgs.appendChild(d);
  msgs.scrollTop=msgs.scrollHeight;
  return d;
}

function escapeHtml(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

function setStatus(s,live){
  statusText.textContent=s;
  dot.className=live?'dot live':'dot';
}

async function init(){
  setStatus('Starting VM...', false);
  addMsg('Initializing agent...','system');
  try{
    const h=await fetch(BASE+'/health?agentId='+AGENT_ID);
    if(!h.ok)throw new Error('Health: '+h.status);
    setStatus('Creating agent...', false);

    const swarmConfig={
      id:'ai-ideas-researcher',
      name:'AI Ideas Research Agent',
      orchestrator:{
        id:'orchestrator',
        name:'Research Orchestrator',
        model:'anthropic/claude-sonnet-4-6',
        instructions:'Sos un orquestador que coordina busqueda web y envio de emails. Cuando te pidan investigar ideas de agentes de IA, usa el worker de busqueda web para encontrar informacion actualizada sobre tendencias 2026, analiza los resultados, y despues usa el worker de email para enviar un resumen profesional al destinatario indicado. Responde siempre en español.',
        tools:[],
        workers:[
          {id:'composio-search',name:'Web Search',role:'Busca informacion en la web',factory:'composio-search'},
          {id:'resend-email',name:'Email Sender',role:'Envia emails',factory:'resend-email'}
        ]
      }
    };

    const cr=await fetch(BASE+'/agent/create/'+AGENT_ID,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:USER_ID,swarm_config:swarmConfig})
    });
    if(!cr.ok){const t=await cr.text();throw new Error('Create: '+cr.status+' '+t)}

    setStatus('Ready',true);
    addMsg('Agent ready. Start chatting.','system');
    input.disabled=false;
    btn.disabled=false;
    input.focus();
    ready=true;
  }catch(e){
    setStatus('Error',false);
    addMsg('Error: '+e.message,'system');
  }
}

form.addEventListener('submit',async(ev)=>{
  ev.preventDefault();
  if(!ready||!input.value.trim())return;
  const text=input.value.trim();
  input.value='';
  btn.disabled=true;
  input.disabled=true;
  addMsg(text,'user');

  const botMsg=document.createElement('div');
  botMsg.className='msg bot';
  botMsg.innerHTML='<div class="label">Agent</div><div class="typing"><span></span><span></span><span></span></div>';
  msgs.appendChild(botMsg);
  msgs.scrollTop=msgs.scrollHeight;

  try{
    const body={prompt:text};
    if(threadId)body.threadId=threadId;
    const r=await fetch(BASE+'/chat/'+AGENT_ID,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    threadId=r.headers.get('X-Thread-Id')||threadId;
    const reader=r.body.getReader();
    const dec=new TextDecoder();
    let content='';
    botMsg.innerHTML='<div class="label">Agent</div>';
    const textNode=document.createElement('span');
    botMsg.appendChild(textNode);
    while(true){
      const{done,value}=await reader.read();
      if(done)break;
      content+=dec.decode(value,{stream:true});
      textNode.textContent=content;
      msgs.scrollTop=msgs.scrollHeight;
    }
    if(!content)textNode.textContent='(empty response)';
  }catch(e){
    botMsg.innerHTML='<div class="label">Agent</div>Error: '+escapeHtml(e.message);
  }
  btn.disabled=false;
  input.disabled=false;
  input.focus();
});

init();
</script>
</body>
</html>`);
}
