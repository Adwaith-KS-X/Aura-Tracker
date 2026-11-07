import React, { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput } from '../Typography';
import { MotionModal } from '../Motion';
import { corners } from '../theme';
import catalog from './catalog.json';
import { foodPortion, indexFoods, parseGrams, searchFoods, type Food } from './model';
import type { MacroEntry } from '../domain';
const foods:Food[]=catalog,index=indexFoods(foods),categories=['All','Indian dishes',...new Set(foods.map(e=>e.category).filter(e=>e!=='Indian dishes'))];
const fmt=(n:number)=>n.toLocaleString(undefined,{maximumFractionDigits:1});
type Portion=Omit<MacroEntry,'id'|'at'|'day'>;
function Action({title,onPress,disabled=false}:{title:string;onPress:()=>void;disabled?:boolean}){return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={onPress} style={[s.button,disabled&&{opacity:.45}]}><Text style={{color:'#121212',fontWeight:'600'}}>{title}</Text></Pressable>;}
function Library({onClose,onSelect}:{onClose:()=>void;onSelect:(food:Food)=>void}){
 const [query,setQuery]=useState(''),[category,setCategory]=useState('All');const deferred=useDeferredValue(query);
 const results=useMemo(()=>searchFoods(index,deferred,category),[deferred,category]);
 return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS==='ios'?'padding':undefined}><View style={s.container}>
  <View style={[s.row,{padding:20}]}><Text accessibilityRole="header" style={s.title}>Find food</Text><Pressable accessibilityRole="button" onPress={onClose} style={s.link}><Text style={s.body}>Close food search</Text></Pressable></View>
  <View style={{paddingHorizontal:20,gap:12,paddingBottom:12}}><TextInput accessibilityLabel="Search foods" value={query} onChangeText={setQuery} placeholder="Try idli, roti, dal, chicken…" placeholderTextColor="#929292" style={s.input} autoCorrect={false} maxLength={100}/>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:8}}>{categories.map(item=><Pressable key={item} accessibilityRole="button" accessibilityLabel={`Food category: ${item}`} aria-pressed={category===item} onPress={()=>setCategory(item)} style={[s.chip,category===item&&{backgroundColor:'#F5F5F5'}]}><Text style={{color:category===item?'#121212':'#BDBDBD',fontSize:12}}>{item}</Text></Pressable>)}</ScrollView>
  <Text style={s.note}>{results.length.toLocaleString()} matches · dishes and ingredients</Text></View>
  <FlatList data={results} key={`${deferred}:${category}`} keyExtractor={item=>item.id} style={s.flex} contentContainerStyle={{paddingHorizontal:20,paddingBottom:24,gap:8}} initialNumToRender={12} windowSize={5} maxToRenderPerBatch={12} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
    renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={`Select food ${item.name}`} onPress={()=>{Keyboard.dismiss();onSelect(item);}} style={s.result}><Text style={s.name}>{item.name}</Text><Text style={s.note}>{Math.round(item.kcal)} kcal / 100 g · P {fmt(item.protein)} · C {fmt(item.carbs)} · F {fmt(item.fat)}</Text><Text style={s.note}>{item.kind==='recipe'?'Recipe estimate':'USDA reference'} · {item.category}</Text></Pressable>}
    ListEmptyComponent={<View style={{paddingVertical:24,gap:12}}><Text style={s.name}>No matching food</Text><Text style={s.note}>Try another spelling or category. You can enter your own macros from Today.</Text><Action title="Reset food search" onPress={()=>{setQuery('');setCategory('All');}}/></View>}
    ListFooterComponent={<Text style={[s.note,{paddingVertical:16}]}>10,000 foods, including {foods.filter(e=>e.category==='Indian dishes').length} Indian entries. USDA FoodData Central (CC0) and clearly labelled Aura recipe estimates. This is not a complete Indian dish database.</Text>}/>
 </View></KeyboardAvoidingView></SafeAreaView>;
}
export function FoodLogger({onLog,busy}:{onLog:(entry:Portion)=>Promise<boolean>;busy:boolean}) {
 const [open,setOpen]=useState(false),[selected,setSelected]=useState<Food|null>(null),[grams,setGrams]=useState('100'),[error,setError]=useState(''),[details,setDetails]=useState(false);
 const amount=parseGrams(grams),portion=selected&&amount!==null?foodPortion(selected,amount):null;
 async function save(){if(!selected||!portion||amount===null){setError('Select a food and enter an amount above 0 and up to 2,000 g.');return;}const saved=await onLog({name:selected.name,foodId:selected.id,source:selected.source,grams:amount,...portion});if(saved){setSelected(null);setGrams('100');setError('');setDetails(false);}}
 return <View style={{gap:14}}>
  <Action title={selected?'Change food':'Search food'} onPress={()=>{setError('');setOpen(true);}}/>
  {selected?<>
    <Text style={s.name}>{selected.name}</Text><Text style={s.note}>{selected.kind==='recipe'?'Recipe-based estimate':'Database reference'} · {Math.round(selected.kcal)} kcal per 100 g</Text>
    <View style={{gap:7}}><Text style={s.note}>Grams consumed</Text><TextInput accessibilityLabel="Grams consumed" keyboardType="decimal-pad" value={grams} onChangeText={setGrams} maxLength={7} style={s.input}/></View>
    {portion&&<View style={s.preview} testID="food-portion"><Text style={{color:'#65D9C5',fontSize:28,fontWeight:'600'}}>{fmt(portion.kcal)} kcal</Text><Text style={s.body}>Protein {fmt(portion.protein)} g · Carbs {fmt(portion.carbs)} g · Fats {fmt(portion.fat)} g</Text><Text style={s.note}>For {fmt(amount!)} g consumed</Text></View>}
    <Text style={s.note}>Estimated nutrition. Recipes, oil and cooking methods vary; match raw or cooked food to what you weighed.</Text>
    <Pressable accessibilityRole="button" onPress={()=>setDetails(!details)} style={s.link}><Text style={s.note}>{details?'Hide food source':'Food source & recipe details'}</Text></Pressable>
    {details&&<View style={{gap:10}}><Text style={s.note}>{selected.source}</Text>{selected.recipeNote&&<Text style={s.note}>{selected.recipeNote}</Text>}<Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(selected.sourceId?`https://fdc.nal.usda.gov/food-details/${selected.sourceId}/nutrients`:'https://fdc.nal.usda.gov/')} style={s.link}><Text style={s.note}>View USDA source ↗</Text></Pressable></View>}
    {!!error&&<Text accessibilityRole="alert" style={s.body}>{error}</Text>}<Action title="Log food" disabled={busy||!portion} onPress={()=>void save()}/>
  </>:<Text style={s.body}>Choose a dish or ingredient, enter the grams you ate, and we’ll calculate its calories and macros.</Text>}
  <MotionModal visible={open} onClose={()=>setOpen(false)} page><Library onClose={()=>setOpen(false)} onSelect={food=>{setSelected(food);setGrams('100');setDetails(false);setOpen(false);}}/></MotionModal>
 </View>;
}
const s=StyleSheet.create({flex:{flex:1,minWidth:0},safe:{flex:1,backgroundColor:'#000'},container:{flex:1,width:'100%',maxWidth:720,alignSelf:'center'},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},title:{fontSize:25,color:'#F5F5F5',fontWeight:'600'},name:{fontSize:16,lineHeight:23,color:'#F5F5F5',fontWeight:'600'},body:{fontSize:13,lineHeight:22,color:'#D0D0D0'},note:{fontSize:11,lineHeight:18,color:'#A3A3A3'},button:{...corners.button,minHeight:48,padding:12,backgroundColor:'#F5F5F5',alignItems:'center',justifyContent:'center'},link:{minHeight:44,justifyContent:'center'},input:{...corners.input,minHeight:48,padding:13,fontSize:16,color:'#F5F5F5',borderWidth:1,borderColor:'#3A3A3A',backgroundColor:'#121212'},chip:{...corners.button,minHeight:44,paddingHorizontal:14,justifyContent:'center',backgroundColor:'#242424'},result:{...corners.inset,backgroundColor:'#121212',padding:16,gap:6,borderWidth:1,borderColor:'#2C2C2C'},preview:{...corners.inset,backgroundColor:'#1D2522',padding:16,gap:8}});
