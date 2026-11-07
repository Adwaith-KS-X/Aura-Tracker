import { Text } from '../Typography';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../Motion';
import { corners } from '../theme';
import { IllustratedDemo } from './IllustratedDemo';

type Point = [number, number];
// Original two-pose diagrams: head, shoulder, hip, elbows, hands, knees, ankles.
type Pose = Point[];
const standing: Pose = [[120,32],[120,54],[120,112],[101,83],[139,83],[99,110],[141,110],[109,145],[131,145],[104,180],[136,180]];
const poses: Record<string, [Pose, Pose]> = {
  'aura-squat': [
    [[132,32],[130,54],[120,112],[147,75],[144,78],[164,93],[160,96],[132,145],[127,148],[128,180],[119,180]],
    [[123,73],[120,95],[87,134],[143,101],[140,105],[168,106],[164,110],[136,144],[128,147],[128,180],[119,180]],
  ],
  '0294': [standing, [[120,32],[120,54],[120,112],[101,83],[139,83],[98,53],[142,53],[109,145],[131,145],[104,180],[136,180]]],
  '3224': [standing, [[120,25],[120,47],[120,105],[91,29],[149,29],[104,7],[136,7],[88,138],[152,138],[66,176],[174,176]]],
  '0662': [
    [[178,66],[165,85],[102,116],[175,126],[158,127],[180,176],[164,176],[68,146],[72,147],[34,176],[40,176]],
    [[180,117],[164,134],[101,149],[146,155],[137,154],[180,176],[164,176],[67,163],[72,164],[34,176],[40,176]],
  ],
};
const bones = [[1,2],[1,3],[1,4],[3,5],[4,6],[2,7],[2,8],[7,9],[8,10]];
function geometry(a: Point,b: Point) { return {x:(a[0]+b[0])/2,y:(a[1]+b[1])/2,length:Math.hypot(b[0]-a[0],b[1]-a[1]),angle:Math.atan2(b[1]-a[1],b[0]-a[0])}; }
export function MovementDemo({ id }: { id: string }) {
  return id === 'aura-squat' ? <OriginalMovementDemo id={id}/> : <IllustratedDemo key={id} id={id}/>;
}
function OriginalMovementDemo({ id }: { id: string }) {
  const reduced = useReducedMotion();
  const [paused,setPaused] = useState(false), [active,setActive] = useState(AppState.currentState === 'active');
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => { const sub = AppState.addEventListener('change', state => setActive(state === 'active')); return () => sub.remove(); },[]);
  useEffect(() => {
    if (reduced || paused || !active) return;
    const options = { duration:1400, easing:Easing.inOut(Easing.sin), useNativeDriver:Platform.OS !== 'web', isInteraction:false };
    const loop = Animated.loop(Animated.sequence([Animated.timing(progress,{...options,toValue:1}),Animated.delay(250),Animated.timing(progress,{...options,toValue:0}),Animated.delay(250)]));
    loop.start(); return () => loop.stop();
  },[progress,reduced,paused,active]);
  const pair = poses[id]; if (!pair) return null;
  const mix = (a:number,b:number) => progress.interpolate({inputRange:[0,1],outputRange:[a,b]});
  return <View style={s.card}>
    <View style={s.row}><Text style={s.label}>MOVEMENT PREVIEW</Text><Pressable accessibilityRole="button" accessibilityLabel={reduced ? 'Show next pose' : paused ? 'Play demo' : 'Pause demo'} onPress={() => { if(reduced){setPaused(!paused);progress.setValue(paused?0:1);}else setPaused(!paused); }} style={s.control}><Text style={s.label}>{reduced ? 'Next pose' : paused ? 'Play' : 'Pause'}</Text></Pressable></View>
    <View accessible accessibilityLabel="Simplified two-pose movement diagram. Written steps follow below." style={s.stage}>
      <View style={s.floor}/>
      {bones.map(([a,b],i) => {const from=geometry(pair[0][a],pair[0][b]),to=geometry(pair[1][a],pair[1][b]);let angle=to.angle;while(angle-from.angle>Math.PI)angle-=2*Math.PI;while(angle-from.angle< -Math.PI)angle+=2*Math.PI;return <Animated.View key={i} testID={i===3?'demo-moving-limb':undefined} style={[s.bone,{backgroundColor:i%2?'#BDBDBD':'#F5F5F5',transform:[{translateX:mix(from.x-30,to.x-30)},{translateY:mix(from.y-2,to.y-2)},{rotate:progress.interpolate({inputRange:[0,1],outputRange:[`${from.angle}rad`,`${angle}rad`]})},{scaleX:mix(from.length/60,to.length/60)}]}]}/>;})}
      <Animated.View style={[s.head,{transform:[{translateX:mix(pair[0][0][0]-10,pair[1][0][0]-10)},{translateY:mix(pair[0][0][1]-10,pair[1][0][1]-10)}]}]}/>
      {id==='0294' && [5,6].map(hand=><Animated.View key={hand} style={[s.weight,{transform:[{translateX:mix(pair[0][hand][0]-9,pair[1][hand][0]-9)},{translateY:mix(pair[0][hand][1]-4,pair[1][hand][1]-4)}]}]}/>)}
    </View>
    <Text style={s.note}>Simplified motion guide · follow the steps below.</Text>
  </View>;
}
const s=StyleSheet.create({card:{...corners.inset,backgroundColor:'#1B1B1B',padding:16,gap:8},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},label:{fontSize:10,letterSpacing:1,color:'#BDBDBD'},control:{padding:10,minHeight:44,justifyContent:'center'},stage:{width:240,height:194,alignSelf:'center'},floor:{position:'absolute',left:20,right:20,top:184,height:1,backgroundColor:'#3A3A3A'},bone:{position:'absolute',left:0,top:0,width:60,height:4,borderRadius:2},head:{position:'absolute',left:0,top:0,width:20,height:20,borderRadius:10,borderWidth:3,borderColor:'#F5F5F5',backgroundColor:'#1B1B1B'},weight:{position:'absolute',left:0,top:0,width:18,height:8,borderRadius:2,backgroundColor:'#F5F5F5'},note:{fontSize:11,lineHeight:17,color:'#BDBDBD',textAlign:'center'}});
