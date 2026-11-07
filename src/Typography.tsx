import React, { createContext, forwardRef, useContext } from 'react';
import { ActivityIndicator, StyleSheet, Text as NativeText, TextInput as NativeTextInput, View, type TextProps, type TextInputProps } from 'react-native';
import { useFonts } from 'expo-font';

const fonts = {
  OutfitMedium: require('@expo-google-fonts/outfit/500Medium/Outfit_500Medium.ttf'),
  OutfitSemibold: require('@expo-google-fonts/outfit/600SemiBold/Outfit_600SemiBold.ttf'),
  OutfitBold: require('@expo-google-fonts/outfit/700Bold/Outfit_700Bold.ttf'),
};
const Ready = createContext(false), Weight = createContext(500);
export function TypographyProvider({children}: {children: React.ReactNode}) {
  const [loaded,error] = useFonts(fonts);
  if (!loaded && !error) return <View style={{flex:1,backgroundColor:'#000000',justifyContent:'center',alignItems:'center'}}><ActivityIndicator color="#FFFFFF"/></View>;
  return <Ready.Provider value={loaded}>{children}</Ready.Provider>;
}
function family(weight:number) { return weight>=700?'OutfitBold':weight>=600?'OutfitSemibold':'OutfitMedium'; }
export const Text = forwardRef<React.ComponentRef<typeof NativeText>,TextProps>(function Text({style,...props},ref) {
  const loaded=useContext(Ready), inherited=useContext(Weight);
  const weight=StyleSheet.flatten(style)?.fontWeight;
  const resolved=weight==='bold'?700:weight==='normal'?500:weight?Number(weight):inherited;
  return <Weight.Provider value={resolved}><NativeText {...props} ref={ref} style={[style,loaded?{fontFamily:family(resolved),fontWeight:'normal'}:{fontWeight:resolved>=600?'600':'500'}]}/></Weight.Provider>;
});
export const TextInput = forwardRef<React.ComponentRef<typeof NativeTextInput>,TextInputProps>(function TextInput({style,...props},ref) {
  const loaded=useContext(Ready);
  return <NativeTextInput {...props} ref={ref} style={[style,loaded?{fontFamily:'OutfitMedium',fontWeight:'normal'}:{fontWeight:'500'}]}/>;
});
