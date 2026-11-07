import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { Text } from './Typography';
import { formatTimeSafe, formatDateSafe } from './dateUtils';
export type ChartPoint={id:string;day:string;at?:string;value:number};
const date=(p:ChartPoint)=>p.at?`${formatDateSafe(p.day)} ${formatTimeSafe(p.at)}`:formatDateSafe(p.day);
export function TrendChart({points,color,unit,label,goal,zeroBaseline=false}:{points:ChartPoint[];color:string;unit:string;label:string;goal?:number;zeroBaseline?:boolean}) {
  const [selected,setSelected]=useState<string|null>(null);
  if(!points.length)return <View style={{paddingVertical:28,gap:8}}><Text style={{color:'#F5F5F5',fontSize:15}}>No entries in this view yet</Text><Text style={{color:'#A3A3A3',fontSize:12,lineHeight:20}}>Save a measurement to start your {label.toLowerCase()} graph. Previous entries stay saved.</Text></View>;
  const chosenIndex=Math.max(0,selected&&points.some(p=>p.id===selected)?points.findIndex(p=>p.id===selected):points.length-1),chosen=points[chosenIndex];
  const values=points.map(p=>p.value),lo=Math.min(...values),hi=Math.max(...values,goal??-Infinity);
  const padding=Math.max((hi-lo)*.2,unit==='BMI'?.2:.1),min=zeroBaseline?0:Math.max(0,lo-padding),max=Math.max(hi+padding,min+.2);
  const x0=48,x1=330,y0=24,y1=192;
  // Give every observation its own position, including same-second logs.
  // Labels show actual timestamps; spacing represents observation order.
  const coords=points.map((p,i)=>({x:points.length===1?189:x0+i/(points.length-1)*(x1-x0),y:y1-(p.value-min)/(max-min)*(y1-y0)}));
  const line=coords.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' '),cross=coords[chosenIndex];
  const fmt=(n:number)=>n.toLocaleString(undefined,{maximumFractionDigits:2});
  const lastPoint = points[points.length - 1];
  const short=(p:ChartPoint)=>points[0].day===lastPoint.day&&p.at?formatTimeSafe(p.at):formatDateSafe(p.day);
  return <View style={{gap:10}} testID={`chart-${label.replaceAll(' ','-')}`}>
    <View style={{gap:4}}><Text style={{color,fontSize:32,fontWeight:'600'}}>{fmt(chosen.value)}<Text style={{fontSize:14,color:'#BDBDBD'}}> {unit}</Text></Text><Text style={{color:'#A3A3A3',fontSize:12}}>{date(chosen)}{!chosen.at?' · date-only record':''}</Text></View>
    <View accessible accessibilityLabel={`${label} graph. ${points.length} saved points. Selected ${date(chosen)}: ${fmt(chosen.value)} ${unit}.`}>
      <Svg width="100%" height={248} viewBox="0 0 350 240">
        {[0,.25,.5,.75,1].map(t=>{const y=y1-t*(y1-y0);return <React.Fragment key={t}><Line x1={x0} x2={x1} y1={y} y2={y} stroke="#2B2B2B" strokeDasharray="2 6"/><SvgText x={38} y={y+4} fill="#A3A3A3" fontSize={10} textAnchor="end">{fmt(min+t*(max-min))}</SvgText></React.Fragment>;})}
        {goal!==undefined&&<Line x1={x0} x2={x1} y1={y1-(goal-min)/(max-min)*(y1-y0)} y2={y1-(goal-min)/(max-min)*(y1-y0)} stroke="#8B8B8B" strokeDasharray="5 5"/>}
        <Line x1={cross.x} x2={cross.x} y1={y0} y2={y1} stroke={color} strokeOpacity={.25} strokeDasharray="3 4"/>
        <Path d={line} fill="none" stroke={color} strokeWidth={9} strokeOpacity={.09} strokeLinejoin="round" strokeLinecap="round"/>
        <Path testID={`line-${label.replaceAll(' ','-')}`} d={line} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round"/>
        {coords.map((p,i)=><React.Fragment key={points[i].id}><Circle cx={p.x} cy={p.y} r={i===chosenIndex?6:3} fill={i===chosenIndex?color:'#121212'} stroke={color} strokeWidth={2}/><Circle cx={p.x} cy={p.y} r={13} fill="transparent" onPress={()=>setSelected(points[i].id)}/></React.Fragment>)}
        <SvgText x={x0} y={220} fontSize={10} fill="#A3A3A3">{short(points[0])}</SvgText><SvgText x={x1} y={220} textAnchor="end" fontSize={10} fill="#A3A3A3">{short(lastPoint)}</SvgText>
      </Svg>
    </View>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>{[-1,0,1].map(direction=>{const i=chosenIndex+direction,disabled=direction!==0&&(i<0||i>=points.length);return <Pressable key={direction} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${direction<0?'Previous':direction>0?'Next':'Latest'} ${label} point`} accessibilityState={{disabled}} onPress={()=>setSelected(direction===0?null:points[i].id)} style={{minHeight:44,justifyContent:'center',opacity:disabled?.3:1}}><Text style={{color:direction===0?color:'#BDBDBD',fontSize:12}}>{direction<0?'‹ Previous':direction>0?'Next ›':'Latest'}</Text></Pressable>;})}</View>
    <Text style={{color:'#A3A3A3',fontSize:11,lineHeight:18}}>{points.length===1?'First saved point. Save another measurement—even today—to draw the line.':`${points.length} points · chronological entry order · tap a point to inspect`}</Text>
  </View>;
}
