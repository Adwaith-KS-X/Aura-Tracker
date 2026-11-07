import { calculateBMI, ageOnDate } from './bmi.ts';
import type { MacroEntry } from './domain.ts';
export const bmiRanges = [
  {label:'Underweight',range:'Below 18.5',color:'#62B8FF'},
  {label:'Healthy weight',range:'18.5 – below 25',color:'#58D9AC'},
  {label:'Overweight',range:'25 – below 30',color:'#FFCA75'},
  {label:'Obesity',range:'30 or above',color:'#EE96C2'},
];
export function bmiReview(kg:number,cm:number,dob:string,now=new Date()) {
  const age=ageOnDate(dob,now), value=calculateBMI(kg,cm);
  if(age<2||value===null)return {value:null,index:-1,title:'BMI not assessed',text:'BMI is not interpreted for children under 2.'};
  if(age<20)return {value,index:-1,title:'Age-specific interpretation needed',text:'For ages 2–19, BMI needs an age- and sex-specific growth chart. The adult reference below does not classify your result.'};
  const raw=kg/(cm/100)**2,index=raw<18.5?0:raw<25?1:raw<30?2:3;
  return {value,index,title:bmiRanges[index].label,text:`Your latest measurements fall in the ${bmiRanges[index].label.toLowerCase()} BMI range for adults. BMI alone cannot assess your overall health or distinguish muscle from body fat.`};
}
export function macroTotals(entries:MacroEntry[]) {return entries.reduce((sum,e)=>({protein:sum.protein+e.protein,carbs:sum.carbs+e.carbs,fat:sum.fat+e.fat,kcal:sum.kcal+(e.kcal??(e.protein*4+e.carbs*4+e.fat*9))}),{protein:0,carbs:0,fat:0,kcal:0});}
export function macroNumber(value:string) {if(!/^\d+(?:[.,]\d+)?$/.test(value.trim()))return null;const n=Number(value.replace(',','.'));return Number.isFinite(n)&&n>=0&&n<=2000?n:null;}
