:root{--bg:#0b0b0f;--fg:#e9ecf1;--muted:#8b91a1;--card:#11131a;--border:#202335;--accent:#6aa7ff}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 Pretendard,system-ui,Segoe UI,Apple SD Gothic Neo}
.nav{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);backdrop-filter:saturate(140%) blur(6px);position:sticky;top:0;background:rgba(11,11,15,.7)}
.brand{font-weight:700}
.menu button{background:transparent;border:0;color:var(--fg);padding:8px 10px;margin:0 2px;border-radius:8px}
.menu button:hover{background:#ffffff12}
.actions{display:flex;gap:8px;align-items:center}
.actions #roleBadge{padding:4px 8px;border:1px solid var(--border);border-radius:6px;color:var(--muted)}
.container{max-width:1200px;margin:16px auto;padding:0 16px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.col-2{grid-column:span 2}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px}
.card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.ghost{background:transparent;border:1px solid var(--border);color:var(--muted);padding:6px 10px;border-radius:8px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.kpi{background:#0f1220;border:1px solid var(--border);padding:10px;border-radius:10px;font-size:12px}
.kpis.small .kpi{grid-template-columns:1fr}
.clock .time{font-size:56px;font-weight:800}
.clock .time span#sec{font-size:28px;margin-left:8px}
.clock .date{color:var(--muted)}
.chat{height:240px;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:8px;background:#0f1220}
.msg{margin:6px 0;max-width:70%}
.msg.me{margin-left:auto;text-align:right}
.bubble{display:inline-block;padding:8px 10px;border-radius:10px;background:#1c2140}
.msg.me .bubble{background:#2854c9}
.chat-input{display:flex;gap:8px;margin-top:8px}
.chat-input input{flex:1;padding:10px;border-radius:8px;border:1px solid var(--border);background:#0f1220;color:var(--fg)}
.row{display:flex;align-items:center;gap:8px;margin:8px 0}
.wrap{flex-wrap:wrap}
.muted{color:var(--muted)}
.list .item{display:flex;justify-content:space-between;gap:8px;padding:8px;border:1px solid var(--border);border-radius:10px;margin:6px 0;background:#0f1220}
.people{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.person{display:flex;justify-content:space-between;border:1px solid var(--border);border-radius:10px;padding:8px;background:#0f1220}
textarea{width:100%;background:#0f1220;border:1px solid var(--border);color:var(--fg);border-radius:8px;padding:8px}
button{cursor:pointer}
