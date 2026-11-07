import { Text, TextInput } from '../Typography';
import React, { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import catalog from './catalog.json';
import { createSearchIndex, demoIds, searchExercises, type Exercise } from './search';
import { MovementDemo } from './MovementDemo';
import { MotionModal, MotionView } from '../Motion';
import { corners } from '../theme';

const exercises: Exercise[] = catalog;
const index = createSearchIndex(exercises);
const bodyParts = ['All', ...new Set(exercises.map(e=>e.bodyPart))].sort((a,b)=>a==='All'?-1:b==='All'?1:a.localeCompare(b));
const equipmentOptions = ['All', ...new Set(exercises.map(e=>e.equipment))].sort((a,b)=>a==='All'?-1:b==='All'?1:a.localeCompare(b));
function Action({title,onPress,primary=false}:{title:string;onPress:()=>void;primary?:boolean}) {return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed})=>[s.button,primary&&s.primary,pressed&&{opacity:.55}]}><Text style={[s.buttonText,primary&&{color:'#121212'}]}>{title}</Text></Pressable>;}
function Filters({label,options,value,onChange}:{label:string;options:string[];value:string;onChange:(value:string)=>void}) {return <View style={{gap:6}}><Text style={s.meta}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:8}}>{options.map(option=><Pressable key={option} accessibilityRole="button" accessibilityLabel={`${label}: ${option}`} accessibilityState={{selected:value===option}} onPress={()=>onChange(option)} style={[s.chip,value===option&&s.primary]}><Text style={[s.chipText,value===option&&{color:'#121212'}]}>{option}</Text></Pressable>)}</ScrollView></View>;}
function Library({initialQuery,onClose,onSelect}:{initialQuery:string;onClose:()=>void;onSelect:(name:string)=>void}) {
  const [query,setQuery]=useState(initialQuery), deferred=useDeferredValue(query);
  const [bodyPart,setBodyPart]=useState('All'),[equipment,setEquipment]=useState('All'),[demosOnly,setDemosOnly]=useState(false);
  const [detail,setDetail]=useState<Exercise|null>(null);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const results=useMemo(()=>searchExercises(index,deferred,bodyPart,equipment,demosOnly),[deferred,bodyPart,equipment,demosOnly]);
  function reset(){setQuery('');setBodyPart('All');setEquipment('All');setDemosOnly(false);}
  return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS==='ios'?'padding':undefined}><View style={s.container}>
    <View style={s.header}><Action title={detail?'Back to exercises':'Close library'} onPress={detail?()=>setDetail(null):onClose}/><Text style={s.meta}>{detail?'EXERCISE GUIDE':`${exercises.length.toLocaleString()} EXERCISES`}</Text></View>
    <MotionView transitionKey={detail?.id??'library'} style={s.flex}>
      {detail?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.detail}>
        <Text accessibilityRole="header" style={s.title}>{detail.name}</Text><Text style={s.meta}>{detail.bodyPart} · {detail.equipment} · {detail.target}</Text>
        {demoIds.has(detail.id)?<MovementDemo key={detail.id} id={detail.id}/>:<View style={s.note}><Text style={s.body}>Written guide available. Movement demo coming later.</Text></View>}
        <Text style={s.subtitle}>How to do it</Text>
        {detail.steps.map((step,i)=><View key={i} style={s.step}><Text style={s.stepNumber}>{String(i+1).padStart(2,'0')}</Text><Text style={[s.body,s.flex]}>{step}</Text></View>)}
        <Action title="Use this exercise" primary onPress={()=>onSelect(detail.name)}/>
      </ScrollView>:<View style={s.flex}>
        <View style={s.searchArea}><Text accessibilityRole="header" style={s.title}>Find your exercise</Text>
          <TextInput accessibilityLabel="Search exercises" placeholder="Search name, muscle, equipment…" placeholderTextColor="#A3A3A3" value={query} onChangeText={setQuery} autoCorrect={false} maxLength={100} style={s.input}/>
          <View style={s.row}><Action title={filtersOpen?'Hide filters':'Show filters'} onPress={()=>{Keyboard.dismiss();setFiltersOpen(!filtersOpen);}}/><Text style={[s.meta,s.flex]}>{[bodyPart,equipment].filter(v=>v!=='All').join(' · ')||'All muscles · All equipment'}</Text></View>
          {filtersOpen&&<><Filters label="Muscle area" options={bodyParts} value={bodyPart} onChange={setBodyPart}/>
          <Filters label="Equipment" options={equipmentOptions} value={equipment} onChange={setEquipment}/></>}
          {filtersOpen&&<View style={s.row}><Pressable accessibilityRole="checkbox" aria-checked={demosOnly} accessibilityState={{checked:demosOnly}} onPress={()=>setDemosOnly(!demosOnly)} style={s.demoToggle}><Text style={s.buttonText}>{demosOnly?'✓ ':''}Workouts with 2D demo</Text></Pressable><Action title="Reset filters" onPress={reset}/></View>}
          <Text style={s.meta}>{results.length.toLocaleString()} matches{query!==deferred?' · Searching…':''}</Text>
        </View>
        <FlatList key={`${deferred}:${bodyPart}:${equipment}:${demosOnly}`} data={results} keyExtractor={item=>item.id} style={s.flex} contentContainerStyle={s.list} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" initialNumToRender={12} maxToRenderPerBatch={12} windowSize={5}
          renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={`View ${item.name}`} onPress={()=>setDetail(item)} style={({pressed})=>[s.result,pressed&&{backgroundColor:'#282828'}]}><View style={s.flex}><Text style={s.name}>{item.name}</Text><Text style={s.meta}>{item.target} · {item.equipment}{demoIds.has(item.id)?' · 2D demo':''}</Text></View><Text style={s.arrow}>›</Text></Pressable>}
          ListEmptyComponent={<View style={s.empty}><Text style={s.subtitle}>No exercises found</Text><Text style={s.body}>Try a shorter name or reset your filters. You can also enter your own exercise in the training form.</Text><Action title="Reset search" onPress={reset}/></View>}
          ListFooterComponent={<Text style={s.credit}>Data: Hasan Emir Yıldırım · MIT. Illustrated previews: Flow · CC0. Original Aura squat diagram.</Text>}/>
      </View>}
    </MotionView>
  </View></KeyboardAvoidingView></SafeAreaView>;
}
export function ExercisePicker({value,onChange}:{value:string;onChange:(value:string)=>void}) {
  const [open,setOpen]=useState(false),[focused,setFocused]=useState(false);
  const query=useDeferredValue(value);
  const suggestions=useMemo(()=>query.trim()?searchExercises(index,query).slice(0,5):[],[query]);
  const selected=useMemo(()=>exercises.find(item=>item.name.toLowerCase()===value.trim().toLowerCase()),[value]);
  return <View style={{gap:8}}>
    <Text style={s.meta}>Exercise name</Text><TextInput accessibilityLabel="Exercise name" value={value} onChangeText={text=>{onChange(text);setFocused(true);}} placeholder="Search or enter your own" placeholderTextColor="#A3A3A3" maxLength={80} onFocus={()=>setFocused(true)} style={s.input}/>
    {focused&&suggestions.length>0&&<View style={s.suggestions}>{suggestions.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Select ${item.name}`} onPress={()=>{onChange(item.name);setFocused(false);}} style={s.suggestion}><Text style={s.name}>{item.name}</Text><Text style={s.meta}>{item.equipment} · {item.target}</Text></Pressable>)}</View>}
    <Action title="Browse workout" onPress={()=>{Keyboard.dismiss();setOpen(true);}}/>
    {!open&&selected&&demoIds.has(selected.id)&&<MovementDemo key={selected.id} id={selected.id}/>}
    <MotionModal visible={open} onClose={()=>setOpen(false)} page>{<Library initialQuery={value} onClose={()=>setOpen(false)} onSelect={name=>{onChange(name);setFocused(false);setOpen(false);}}/>}</MotionModal>
  </View>;
}
const s=StyleSheet.create({flex:{flex:1,minWidth:0},safe:{flex:1,backgroundColor:'#000000'},container:{flex:1,width:'100%',maxWidth:720,alignSelf:'center'},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#2C2C2C'},searchArea:{padding:20,gap:12},title:{fontSize:26,lineHeight:34,fontWeight:'600',letterSpacing:-.8,color:'#F5F5F5'},subtitle:{fontSize:17,lineHeight:24,fontWeight:'600',color:'#F5F5F5'},input:{...corners.input,borderWidth:1,borderColor:'#3A3A3A',backgroundColor:'#121212',padding:13,minHeight:48,fontSize:16,color:'#F5F5F5'},button:{...corners.button,minHeight:44,justifyContent:'center',alignItems:'center',paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:'#3A3A3A'},buttonText:{fontSize:12,color:'#F5F5F5',fontWeight:'500'},primary:{backgroundColor:'#F5F5F5',borderColor:'#F5F5F5'},chip:{...corners.button,borderWidth:1,borderColor:'#3A3A3A',paddingHorizontal:14,minHeight:44,justifyContent:'center'},chipText:{fontSize:12,color:'#BDBDBD',textTransform:'capitalize'},meta:{fontSize:11,lineHeight:18,color:'#BDBDBD'},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},demoToggle:{minHeight:44,justifyContent:'center'},list:{paddingHorizontal:20,paddingBottom:24,gap:8},result:{...corners.inset,flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#121212',padding:16,minHeight:78,borderWidth:1,borderColor:'#2C2C2C'},name:{fontSize:14,lineHeight:21,color:'#F5F5F5',fontWeight:'500'},arrow:{fontSize:25,color:'#A3A3A3'},detail:{padding:20,gap:20},step:{flexDirection:'row',gap:14},stepNumber:{fontSize:12,color:'#A3A3A3',paddingTop:3},body:{fontSize:14,lineHeight:23,color:'#D0D0D0'},note:{...corners.inset,backgroundColor:'#242424',padding:16},empty:{paddingVertical:24,gap:14},credit:{fontSize:10,lineHeight:16,color:'#A3A3A3',paddingVertical:20},suggestions:{...corners.inset,borderWidth:1,borderColor:'#2C2C2C',overflow:'hidden'},suggestion:{padding:12,borderBottomWidth:1,borderBottomColor:'#242424',minHeight:56}});
