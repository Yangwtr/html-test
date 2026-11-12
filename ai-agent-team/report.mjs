// Human-readable Markdown report; requires factual task inputs, no fabricated test results.
export function progressReport(tasks){
 if(!Array.isArray(tasks)) throw new Error('tasks must be an array');
 const count=(status)=>tasks.filter(t=>t.status===status).length;
 const lines=['# AI-Agent-Team Progress Report','',`Total tasks: ${tasks.length}`,`Done: ${count('done')}`,`Blocked: ${count('blocked')}`,''];
 for(const t of tasks){
  if(!t?.id) throw new Error('task.id required');
  lines.push(`## ${String(t.id).replace(/[\r\n]/g,' ')} — ${String(t.status||'unknown')}`);
  lines.push(`Owner: ${t.owner||'unassigned'}`);
  lines.push(`Summary: ${t.summary||'Not provided'}`);
  lines.push(`Tests: ${Array.isArray(t.test_results)&&t.test_results.length?t.test_results.join('; '):'Not reported'}`);
  lines.push(`Risks: ${Array.isArray(t.open_risks)&&t.open_risks.length?t.open_risks.join('; '):'Not reported'}`);
  lines.push(`Next: ${t.next_action||'Not assigned'}`,'');
 }
 return lines.join('\n');
}
