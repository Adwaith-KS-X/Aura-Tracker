import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Text } from './Typography';
import { corners } from './theme';
import type { MacroEntry } from './domain';
import { macroGraphPoints, type MacroPoint } from './macroGraphModel';
import { formatDateSafe, formatTimeSafe } from './dateUtils';
const series=[{key:'protein',label:'Protein',color:'#BAA6FF'},{key:'carbs',label:'Carbs',color:'#FFCA75'},{key:'fat',label:'Fats',color:'#EE96C2'}] as const;
type Key=typeof series[number]['key'];
const fmt=(n:number)=>n.toLocaleString(undefined,{maximumFractionDigits:1});
const date=(p:MacroPoint)=>p.at?`${formatDateSafe(p.day)} ${formatTimeSafe(p.at)}`:formatDateSafe(p.day, true);
export function MacroGraph({entries,today}:{entries:MacroEntry[];today:string}) {
  const [range,setRange]=useState('7 days'),[selected,setSelected]=useState<string|null>(null),[shown,setShown]=useState<Key[]>(['protein','carbs','fat']);
  const points=useMemo(()=>macroGraphPoints(entries,today,range),[entries,today,range]);
  const lastPoint = points[points.length - 1];
  const active=points.find(p=>p.id===selected)??lastPoint,index=active?points.indexOf(active):0;
  const max=Math.max(10,...points.flatMap(p=>shown.map(key=>p[key])))*1.15;
  const x=(i:number)=>points.length===1?190:44+i/Math.max(1,points.length-1)*286,y=(value:number)=>190-value/max*160;
  function toggle(key:Key){setShown(old=>old.includes(key)?old.length>1?old.filter(k=>k!==key):old:[...old,key]);}
  return <View style={s.card} testID="macro-graph"><Text style={s.title}>🥗 Macros graph</Text>
    <View style={s.row}>{['Today','7 days','30 days'].map(option=><Pressable key={option} accessibilityRole="button" accessibilityLabel={`${option} macros`} accessibilityState={{selected:range===option}} onPress={()=>{setRange(option);setSelected(null);}} style={[s.range,range===option&&{backgroundColor:'#F5F5F5'}]}><Text style={{color:range===option?'#121212':'#BDBDBD',fontSize:12}}>{option}</Text></Pressable>)}</View>
    <Text style={s.note}>{active?`${date(active)}${range==='Today'?` · after ${active.name}`:''}`:'No meals logged in this period'}</Text>
    <View style={s.row}>{series.map(item=><Pressable key={item.key} accessibilityRole="checkbox" aria-checked={shown.includes(item.key)} accessibilityState={{checked:shown.includes(item.key)}} accessibilityLabel={`Show ${item.label.toLowerCase()}`} onPress={()=>toggle(item.key)} style={[s.metric,{borderColor:shown.includes(item.key)?item.color:'#333333',opacity:shown.includes(item.key)?1:.45}]}><Text style={[s.value,{color:item.color}]}>{active?`${fmt(active[item.key])} g`:'—'}</Text><Text style={s.note}>{item.label}</Text><View style={{backgroundColor:item.color,height:3,borderRadius:2,marginTop:5}}/></Pressable>)}</View>
    {active?<><View accessible accessibilityLabel={`Macros graph. ${date(active)}. Protein ${fmt(active.protein)} grams, carbs ${fmt(active.carbs)} grams, fats ${fmt(active.fat)} grams.`}>
      <Svg width="100%" height={250} viewBox="0 0 350 240">
        {[0,.25,.5,.75,1].map(t=><React.Fragment key={t}><Line x1={44} x2={330} y1={y(t*max)} y2={y(t*max)} stroke="#303030" strokeDasharray="2 6"/><SvgText x={35} y={y(t*max)+4} textAnchor="end" fontSize={10} fill="#A3A3A3">{fmt(t*max)}</SvgText></React.Fragment>)}
        <SvgText x={12} y={15} fontSize={10} fill="#A3A3A3">grams</SvgText>
        <Line x1={x(index)} x2={x(index)} y1={30} y2={190} stroke="#AAAAAA" strokeOpacity={.35} strokeDasharray="3 4"/>
        {series.filter(item=>shown.includes(item.key)).map(item=><React.Fragment key={item.key}><Path testID={`macro-path-${item.key}`} d={points.map((p,i)=>`${i?'L':'M'}${x(i)},${y(p[item.key])}`).join(' ')} stroke={item.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none"/>{points.map((p,i)=><Circle key={p.id} cx={x(i)} cy={y(p[item.key])} r={i===index?5:2.5} fill={i===index?item.color:'#121212'} stroke={item.color} strokeWidth={1.5}/>)}</React.Fragment>)}
        {points.map((p,i)=><Rect key={p.id} x={x(i)-Math.min(20,143/Math.max(1,points.length-1))} y={22} width={Math.min(40,286/Math.max(1,points.length-1))} height={176} fill="transparent" onPress={()=>setSelected(p.id)}/>)}
        <SvgText x={44} y={219} fill="#A3A3A3" fontSize={10}>{range==='Today'?'First meal':date(points[0])}</SvgText><SvgText x={330} y={219} textAnchor="end" fill="#A3A3A3" fontSize={10}>{range==='Today'?'Latest meal':date(lastPoint)}</SvgText>
      </Svg>
    </View><View style={[s.row,{justifyContent:'space-between'}]}>{[-1,0,1].map(direction=><Pressable key={direction} accessibilityRole="button" accessibilityLabel={`${direction<0?'Previous':direction>0?'Next':'Latest'} macros point`} disabled={direction!==0&&(index+direction<0||index+direction>=points.length)} onPress={()=>setSelected(direction===0?null:points[index+direction].id)} style={{minHeight:44,justifyContent:'center',opacity:direction!==0&&(index+direction<0||index+direction>=points.length)?.3:1}}><Text style={s.note}>{direction<0?'‹ Previous':direction>0?'Next ›':'Latest'}</Text></Pressable>)}</View>
    <Text style={s.note}>{range==='Today'?'Running totals after each saved meal, in time order.':'Daily logged totals. Zero means no amount logged, not necessarily no food consumed.'}{active.count===0?' No meals logged for the selected day.':''}</Text>
    {points.length===1&&<Text style={s.note}>Your first meal is saved. Add another meal to see the trend.</Text>}</>:<Text style={[s.note,{paddingVertical:28}]}>Log a meal under Consumed macros on Today to start your graph.</Text>}
    <Text style={s.note}>Tap a date to inspect values. Tap a macro above to show or hide it.</Text>
  </View>;
}
const s=StyleSheet.create({card:{...corners.card,backgroundColor:'#121212',borderWidth:1,borderColor:'#2C2C2C',padding:20,gap:16},title:{fontSize:18,fontWeight:'600',color:'#F5F5F5'},row:{flexDirection:'row',gap:8},range:{flex:1,minHeight:44,borderRadius:14,backgroundColor:'#242424',alignItems:'center',justifyContent:'center'},metric:{...corners.input,flex:1,minWidth:0,padding:10,borderWidth:1,gap:4,backgroundColor:'#1B1B1B'},value:{fontSize:17,fontWeight:'600'},note:{fontSize:11,lineHeight:18,color:'#BDBDBD'}});
