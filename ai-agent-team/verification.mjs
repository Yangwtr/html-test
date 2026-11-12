// Independent review gate: never treat an AI's self-report as test evidence.
export function evaluateVerification({implementer,reviewer,reviewApproved=false,ciConclusion,securityFindings=[],humanApproved=false}={}) {
  const reasons=[];
  if(!implementer||!reviewer||implementer===reviewer)reasons.push('independent reviewer required');
  if(reviewApproved!==true)reasons.push('review not approved');
  if(ciConclusion!=='success')reasons.push('verified CI success required');
  if(!Array.isArray(securityFindings)||securityFindings.some(x=>x.severity==='high'||x.severity==='critical'))reasons.push('unresolved high-risk security findings');
  if(humanApproved!==true)reasons.push('human merge approval required');
  return {ready:reasons.length===0,reasons};
}
