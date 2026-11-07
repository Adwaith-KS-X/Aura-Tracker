import { Text } from '../Typography';
import React, { useEffect, useState } from 'react';
import { AppState, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../Motion';
import { corners } from '../theme';
import { animationAssets } from './animationAssets';

const sequence = [0, 1, 2, 1];
export function IllustratedDemo({ id }: { id: string }) {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [visible, setVisible] = useState(true);
  const [step, setStep] = useState(0), [width, setWidth] = useState(240);
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setActive(state === 'active'));
    if (Platform.OS !== 'web') return () => sub.remove();
    const update = () => setVisible(!document.hidden); update();
    document.addEventListener('visibilitychange', update);
    return () => { sub.remove(); document.removeEventListener('visibilitychange', update); };
  }, []);
  useEffect(() => { setStep(0); }, [reduced]);
  useEffect(() => {
    if (!ready || failed || paused || reduced || !active || !visible) return;
    const timer = setInterval(() => setStep(previous => (previous + 1) % sequence.length), 480);
    return () => clearInterval(timer);
  }, [ready, failed, paused, reduced, active, visible]);
  const asset = animationAssets[id];
  if (!asset) return null;
  return <View style={s.card} testID="illustrated-demo">
    <View style={s.row}><Text style={s.label}>MOVEMENT PREVIEW</Text>
      {!failed && <Pressable accessibilityRole="button" accessibilityLabel={reduced ? 'Show next pose' : paused ? 'Play demo' : 'Pause demo'} onPress={() => reduced ? setStep(previous => (previous + 1) % sequence.length) : setPaused(!paused)} style={s.control}><Text style={s.controlText}>{reduced ? 'Next pose' : paused ? 'Play' : 'Pause'}</Text></Pressable>}
    </View>
    <View style={s.stage} onLayout={event => setWidth(event.nativeEvent.layout.width)} accessible accessibilityLabel="Three-pose illustrated movement preview. Written instructions are below.">
      {!failed && <Image testID="demo-sprite" source={asset} resizeMode="stretch" onLoad={() => setReady(true)} onError={() => setFailed(true)} style={{ width: width * 3, height: width, transform: [{ translateX: -sequence[step] * width }] }} />}
      {(!ready || failed) && <View style={s.status}><Text style={s.note}>{failed ? 'Preview unavailable. Follow the written guide.' : 'Loading preview…'}</Text></View>}
    </View>
    <View style={s.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{[0,1,2].map(frame => <View key={frame} style={[s.dot, sequence[step] === frame && { backgroundColor: '#FFF' }]} />)}</View>
    <Text style={s.note}>Illustrated preview · follow the written guide.</Text>
  </View>;
}
const s=StyleSheet.create({card:{...corners.inset,backgroundColor:'#202020',padding:14,gap:6,overflow:'hidden'},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},label:{fontSize:10,letterSpacing:1,color:'#D5D5D5'},control:{minHeight:44,paddingHorizontal:10,justifyContent:'center'},controlText:{fontSize:12,color:'#FFF'},stage:{width:'100%',aspectRatio:1,overflow:'hidden',maxWidth:320,alignSelf:'center'},status:{position:'absolute',top:0,left:0,right:0,bottom:0,justifyContent:'center',alignItems:'center',padding:12,backgroundColor:'#202020'},dots:{flexDirection:'row',justifyContent:'center',gap:5,paddingVertical:8},dot:{width:5,height:5,borderRadius:3,backgroundColor:'#626262'},note:{fontSize:11,lineHeight:17,textAlign:'center',color:'#C0C0C0'}});
