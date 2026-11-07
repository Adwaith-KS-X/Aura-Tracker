import { FoodLogger } from './foods/FoodLogger';
import { MacroGraph } from './MacroGraph';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { uid } from './uuid';
import { Text, TextInput } from './Typography';
import { corners } from './theme';
import { TrendChart } from './LineChart';
import { ageOnDate, calculateBMI } from './bmi';
import { bmiReview, bmiRanges, macroNumber, macroTotals } from './progressModel';
import { localDay, positiveNumber, recentDays, sortedWeights, weightKey, weightChange, type TrackerData } from './domain';
import { kgToPounds, type Profile } from './account/profile';
import { Alert } from './dialogs';
import { formatDateSafe } from './dateUtils';
type Commit=(update:(previous:TrackerData)=>TrackerData,message?:string)=>Promise<boolean>;
const fmt=(n:number)=>n.toLocaleString(undefined,{maximumFractionDigits:1});
const dayLabel=(day:string)=>formatDateSafe(day, false);
function Card({children}:{children:React.ReactNode}){return <View style={s.card}>{children}</View>;}
function Button({title,onPress,disabled=false}:{title:string;onPress:()=>void;disabled?:boolean}){return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={onPress} style={[s.button,disabled&&{opacity:.5}]}><Text style={{color:'#101010',fontWeight:'600'}}>{title}</Text></Pressable>;}
export function ProgressDashboard({data,profile,today,commit,busy}:{data:TrackerData;profile:Profile;today:string;commit:Commit;busy:boolean}) {
  const wide=useWindowDimensions().width>=760;
  const weights=sortedWeights(data.weights),latest=weights[weights.length-1],previous=weights[weights.length-2];
  const convert=(kg:number)=>profile.weight_unit==='lb'?kgToPounds(kg):kg;
  const change=weightChange(weights),review=bmiReview(latest?.kg??profile.initial_weight_kg,profile.height_cm,profile.dob);
  const days=recentDays(7,new Date(`${today}T12:00:00`)),water=new Map(days.map(day=>[day,0]));
  for(const entry of data.water){const day=entry.day??localDay(new Date(entry.at));if(water.has(day))water.set(day,water.get(day)!+entry.ml);}
  const weekTraining=data.exercises.filter(e=>days.includes(e.day??localDay(new Date(e.at))));
  const trainingDays=new Set(weekTraining.map(e=>e.day??localDay(new Date(e.at)))).size;
  const [range,setRange]=useState('All'),[waterRange,setWaterRange]=useState('Today');
  const recentWeights=range==='All'?weights:weights.filter(e=>e.day>=recentDays(range==='7 days'?7:30,new Date(today+'T12:00:00'))[0]);
  const waterDays=recentDays(waterRange==='30 days'?30:7,new Date(today+'T12:00:00'));
  const waterByDay=new Map(waterDays.map(day=>[day,0]));
  for(const e of data.water){const day=e.day??localDay(new Date(e.at));if(waterByDay.has(day))waterByDay.set(day,waterByDay.get(day)!+e.ml);}
  let total=0;
  const waterPoints=waterRange==='Today'?data.water.filter(e=>(e.day??localDay(new Date(e.at)))===today).sort((a,b)=>a.at.localeCompare(b.at)).map(e=>({id:e.id,day:today,at:e.at,value:(total+=e.ml)/1000})):waterDays.map(day=>({id:day,day,value:waterByDay.get(day)!/1000}));
  return <View style={{gap:20}}>
    <View style={[s.grid,wide&&s.horizontal]}>
      <View style={s.flex}><Card><Text style={s.label}>⚖️ LATEST WEIGHT</Text><Text style={s.large}>{latest?fmt(convert(latest.kg)):'—'} <Text style={s.unit}>{profile.weight_unit}</Text></Text><Text style={s.note}>{latest?dayLabel(latest.day):'Record a weigh-in from Today'}</Text></Card></View>
      <View style={s.flex}><Card><Text style={s.label}>↔️ WEIGHT CHANGE</Text><Text style={[s.large,{color:'#64DAC7'}]}>{change===null?'—':`${change>0?'+':''}${fmt(convert(change))}`} <Text style={s.unit}>{profile.weight_unit}</Text></Text><Text style={s.note}>{latest&&previous?`${fmt(convert(previous.kg))} → ${fmt(convert(latest.kg))} ${profile.weight_unit} · ${dayLabel(previous.day)} to ${dayLabel(latest.day)}`:'Save two weigh-ins to see the change'}</Text><Text style={s.note}>Latest minus previous weigh-in.</Text></Card></View>
    </View>
    <Card><Text style={s.title}>🧭 Your BMI review</Text><View style={s.row}><Text style={[s.large,{color:review.index>=0?bmiRanges[review.index].color:'#BAA6FF'}]}>{review.value?.toFixed(1)??'—'}</Text><Text style={[s.subtitle,{flex:1,textAlign:'right'}]}>{review.title}</Text></View><Text style={s.body}>{review.text}</Text><Text style={s.note}>Using {fmt(latest?.kg??profile.initial_weight_kg)} kg and {profile.height_cm} cm. BMI is a screening measure, not a diagnosis.</Text></Card>
    <Range options={["7 days","30 days","All"]} value={range} onChange={setRange}/>
    <View style={[s.grid,wide&&s.horizontal]}>
      <View style={s.flex}><Card><Text style={s.title}>⚖️ Body weight graph</Text><Text style={s.note}>{recentWeights.length} saved measurements · including same-day entries</Text><TrendChart points={recentWeights.map(e=>({id:weightKey(e),day:e.day,at:e.at,value:convert(e.kg)}))} color="#65D9C5" unit={profile.weight_unit} label="Body weight"/></Card></View>
      <View style={s.flex}><Card><Text style={s.title}>🧭 BMI graph</Text><Text style={s.note}>Recalculated from logged weights and current height</Text><TrendChart points={recentWeights.filter(e=>ageOnDate(profile.dob,new Date(`${e.day}T12:00:00`))>=2).map(e=>({id:weightKey(e),day:e.day,at:e.at,value:calculateBMI(e.kg,profile.height_cm)!}))} color="#BAA6FF" unit="BMI" label="BMI"/><Text style={s.note}>Height changes recalculate this trend; it is not a growth chart.</Text></Card></View>
    </View>
    <Card><Text style={s.title}>💧 Hydration graph</Text><Range options={["Today","7 days","30 days"]} value={waterRange} onChange={setWaterRange}/><TrendChart points={waterPoints} color="#61BAFF" unit="L" label="Hydration" zeroBaseline goal={data.goalMl/1000}/><Text style={s.note}>{waterRange==="Today"?"Cumulative logged water after each drink today.":"Daily logged totals. Zero means no water logged that day."} Dashed line: current goal of {fmt(data.goalMl/1000)} L.</Text></Card>
    <Card><Text style={s.title}>📖 BMI reference chart</Text><Text style={s.note}>General reference for adults aged 20 and older.</Text><View style={{flexDirection:'row',gap:5}}>{bmiRanges.map(item=><View key={item.label} style={{flex:1,height:9,borderRadius:5,backgroundColor:item.color}}/>)}</View>{bmiRanges.map((item,i)=><View key={item.label} style={[s.range,review.index===i&&{borderColor:item.color,backgroundColor:'#1C1C1C'}]}><View style={[s.dot,{backgroundColor:item.color}]}/><Text style={[s.body,s.flex]}>{item.label}</Text><Text style={s.note}>{item.range}</Text></View>)}<Text style={s.note}>Adult categories do not apply to children or teens. Your history, body composition, and other health measures also matter.</Text><Pressable accessibilityRole="link" onPress={()=>void Linking.openURL('https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html')} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:'#BDBDBD',fontSize:12,textDecorationLine:'underline'}}>Source: CDC BMI categories ↗</Text></Pressable></Card>
    <MacroGraph entries={data.macros ?? []} today={today}/>
    <Card><Text style={s.title}>🏋️ Training activity</Text><Text style={s.body}>{trainingDays} training days · {weekTraining.reduce((n,e)=>n+e.sets,0)} sets · {weekTraining.length} exercises</Text><Text style={s.note}>Your last 7 days. Training is tracked separately from nutrition and body measurements.</Text></Card>
  </View>;
}
function Range({options,value,onChange}:{options:string[];value:string;onChange:(value:string)=>void}) {return <View style={{flexDirection:'row',gap:8}}>{options.map(option=><Pressable key={option} accessibilityRole="button" accessibilityLabel={option+' chart range'} accessibilityState={{selected:option===value}} onPress={()=>onChange(option)} style={{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:14,backgroundColor:option===value?'#F5F5F5':'#222222'}}><Text style={{color:option===value?'#121212':'#BDBDBD',fontSize:12}}>{option}</Text></Pressable>)}</View>;}
export function MacroLogging({data,today,commit,busy}:{data:TrackerData;today:string;commit:Commit;busy:boolean}) {
  const [name,setName]=useState(''),[protein,setProtein]=useState(''),[carbs,setCarbs]=useState(''),[fat,setFat]=useState(''),[error,setError]=useState(''),[calories,setCalories]=useState(''),[mode,setMode]=useState<'food'|'manual'>('food');
  const entries=[...(data.macros??[])].sort((a,b)=>b.at.localeCompare(a.at)),totals=macroTotals(entries.filter(e=>e.day===today));
  async function save(){const p=macroNumber(protein),c=macroNumber(carbs),f=macroNumber(fat),kcal=calories.trim()===''?undefined:calories.trim()==='0'?0:positiveNumber(calories,20000);if(!name.trim()||p===null||c===null||f===null||kcal===null||(p+c+f===0&&!kcal)){setError('Enter a meal name and valid grams for every macro. Optional calories must be between 0 and 20,000.');return;}if(await commit(old=>({...old,macros:[...(old.macros??[]),{id:uid(),at:new Date().toISOString(),day:localDay(),name:name.trim(),protein:p,carbs:c,fat:f,...(kcal===undefined?{}:{kcal}),source:'Manual entry'}]}),'Meal added')){setName('');setProtein('');setCarbs('');setFat('');setCalories('');setError('');}}

  return <Card><Text style={s.title}>🥗 Consumed macros</Text><Text style={s.note}>Today · {Math.round(totals.kcal).toLocaleString()} estimated kcal</Text>
    <View style={{flexDirection:'row',gap:8}}>{[{label:'Protein',value:totals.protein,color:'#BAA6FF'},{label:'Carbs',value:totals.carbs,color:'#FFCA75'},{label:'Fat',value:totals.fat,color:'#EE96C2'}].map(m=><View key={m.label} style={[s.macro,s.flex]}><Text style={[s.subtitle,{color:m.color}]}>{fmt(m.value)} g</Text><Text style={s.note}>{m.label}</Text><View style={{height:3,backgroundColor:m.color,borderRadius:2,marginTop:7}}/></View>)}</View>
    <View style={{flexDirection:'row',gap:8}}>{[{id:'food' as const,label:'Food'},{id:'manual' as const,label:'Own macros'}].map(item=><Pressable key={item.id} accessibilityRole="button" aria-pressed={mode===item.id} onPress={()=>{setMode(item.id);setError('');}} style={{flex:1,minHeight:44,borderRadius:14,backgroundColor:mode===item.id?'#F5F5F5':'#242424',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:12,color:mode===item.id?'#121212':'#BDBDBD'}}>{item.label}</Text></Pressable>)}</View>
    {mode==='food'?<FoodLogger busy={busy} onLog={entry=>commit(old=>({...old,macros:[...(old.macros??[]),{...entry,id:uid(),at:new Date().toISOString(),day:localDay()}]}),'Food added')}/>:<>
    <Text style={s.body}>Enter the totals for the amount you ate, using your recipe or food label.</Text>
    <TextInput accessibilityLabel="Meal name" placeholder="Meal name, e.g. Lunch" placeholderTextColor="#929292" value={name} onChangeText={setName} maxLength={80} style={s.input}/>
    <View style={{flexDirection:'row',gap:8}}>{[{label:'Protein (g)',value:protein,set:setProtein},{label:'Carbs (g)',value:carbs,set:setCarbs},{label:'Fat (g)',value:fat,set:setFat}].map(field=><View key={field.label} style={[s.flex,{gap:8}]}><Text style={s.note}>{field.label}</Text><TextInput accessibilityLabel={field.label} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#929292" value={field.value} onChangeText={field.set} maxLength={7} style={s.input}/></View>)}</View>
    <View style={{gap:7}}><Text style={s.note}>Calories (optional)</Text><TextInput accessibilityLabel="Calories (optional)" value={calories} onChangeText={setCalories} keyboardType="decimal-pad" placeholder="Calculate from macros" placeholderTextColor="#929292" maxLength={8} style={s.input}/></View>
    {!!error&&<Text accessibilityRole="alert" style={s.body}>{error}</Text>}<Button title="Log meal" disabled={busy} onPress={()=>void save()}/>
    <Text style={s.note}>Leave calories blank to estimate energy from protein (4), carbs (4), and fat (9 kcal/g).</Text></>}
</Card>;
}

const s=StyleSheet.create({flex:{flex:1,minWidth:0},card:{...corners.card,backgroundColor:'#121212',borderWidth:1,borderColor:'#2C2C2C',padding:20,gap:16},grid:{gap:16},horizontal:{flexDirection:'row',alignItems:'stretch'},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},title:{fontSize:18,color:'#F5F5F5',fontWeight:'600'},subtitle:{fontSize:15,lineHeight:22,color:'#F5F5F5',fontWeight:'600'},label:{fontSize:11,letterSpacing:1,color:'#BDBDBD'},large:{fontSize:36,color:'#F5F5F5',fontWeight:'600'},unit:{fontSize:15,color:'#A3A3A3'},body:{fontSize:13,lineHeight:22,color:'#D0D0D0'},note:{fontSize:11,lineHeight:18,color:'#A3A3A3'},range:{...corners.input,flexDirection:'row',alignItems:'center',padding:12,gap:10,borderWidth:1,borderColor:'#2C2C2C'},dot:{width:8,height:8,borderRadius:4},macro:{...corners.input,backgroundColor:'#1F1F1F',padding:12,gap:4},input:{...corners.input,minHeight:48,borderWidth:1,borderColor:'#3A3A3A',padding:12,fontSize:15,color:'#F5F5F5'},button:{...corners.button,minHeight:48,backgroundColor:'#F5F5F5',alignItems:'center',justifyContent:'center',padding:12},history:{borderTopWidth:1,borderTopColor:'#2C2C2C',paddingTop:12,gap:6}});
