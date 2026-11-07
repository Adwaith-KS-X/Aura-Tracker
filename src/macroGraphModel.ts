import { recentDays, type MacroEntry } from './domain.ts';
export type MacroPoint={id:string;day:string;at?:string;name?:string;protein:number;carbs:number;fat:number;count:number};
export function macroGraphPoints(entries:MacroEntry[],today:string,range:string):MacroPoint[] {
  if(range==='Today'){
    const totals={protein:0,carbs:0,fat:0};
    return entries.filter(e=>e.day===today).sort((a,b)=>a.at.localeCompare(b.at)).map((e,i)=>{totals.protein+=e.protein;totals.carbs+=e.carbs;totals.fat+=e.fat;return {id:e.id,day:e.day,at:e.at,name:e.name,...totals,count:i+1};});
  }
  const days=recentDays(range==='30 days'?30:7,new Date(`${today}T12:00:00`));
  const points=new Map(days.map(day=>[day,{id:day,day,protein:0,carbs:0,fat:0,count:0}]));
  for(const entry of entries){const point=points.get(entry.day);if(point){point.protein+=entry.protein;point.carbs+=entry.carbs;point.fat+=entry.fat;point.count++;}}
  return [...points.values()].some(p=>p.count)?[...points.values()]:[];
}
