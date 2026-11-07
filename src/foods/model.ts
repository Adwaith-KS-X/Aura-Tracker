export type Food={id:string;name:string;aliases:string;category:string;kcal:number;protein:number;carbs:number;fat:number;source:string;sourceId:string;kind:string;recipeNote?:string};
export const normalizeFood=(text:string)=>text.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function indexFoods(foods:Food[]) {return foods.map(food=>({food,name:normalizeFood(food.name),text:normalizeFood(`${food.name} ${food.aliases}`)}));}
export function searchFoods(index:ReturnType<typeof indexFoods>,query:string,category='All') {
 const term=normalizeFood(query),words=term.split(' ').filter(Boolean);
 return index.filter(e=>(category==='All'||e.food.category===category)&&words.every(word=>e.text.includes(word)))
 .sort((a,b)=>Number(b.name===term)-Number(a.name===term)||Number(b.name.startsWith(term))-Number(a.name.startsWith(term))||Number(b.food.category==='Indian dishes')-Number(a.food.category==='Indian dishes')||a.name.length-b.name.length||a.name.localeCompare(b.name)).map(e=>e.food);
}
export function parseGrams(text:string):number|null {if(!/^\d+(?:[.,]\d+)?$/.test(text.trim()))return null;const n=Number(text.trim().replace(',','.'));return n>=.1&&n<=2000?n:null;}
export function foodPortion(food:Food,grams:number) {
 if(!Number.isFinite(grams)||grams<=0||grams>2000)throw new Error('Enter grams between 0 and 2,000.');
 const scale=(value:number)=>Math.round(value*grams)/100;
 return {kcal:scale(food.kcal),protein:scale(food.protein),carbs:scale(food.carbs),fat:scale(food.fat)};
}
