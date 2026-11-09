import type {SQLiteDatabase,SQLiteBindValue} from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

const TABLES=[
{name:'categories',columns:['id','name','kind','sort_order']},
{name:'ingredients',columns:['id','name','normalized_name','category_id','created_at','updated_at']},
{name:'recipes',columns:['id','title','description','image_uri','category_id','prep_minutes','cook_minutes','default_servings','is_favourite','created_at','updated_at']},
{name:'recipe_ingredients',columns:['id','recipe_id','ingredient_id','quantity','unit_code','display_note','sort_order']},
{name:'recipe_steps',columns:['id','recipe_id','instruction','sort_order']},
{name:'inventory',columns:['id','ingredient_id','quantity','unit_code','minimum_quantity','location','expiry_date','updated_at']},
{name:'shopping_items',columns:['id','name','ingredient_id','quantity','unit_code','notes','is_completed','created_at']},
{name:'cooking_history',columns:['id','event_id','recipe_id','recipe_title','servings','cooked_at']},
{name:'cooking_deductions',columns:['id','cooking_history_id','ingredient_id','requested_quantity','deducted_quantity','unit_code','requested_unit_code','deducted_unit_code']},
] as const;
type TableName=typeof TABLES[number]['name'];
type BackupRow=Record<string,string|number|null>;
export type KitchenBackup={format:'recipe-kitchen-backup';version:1;createdAt:string;tables:Record<TableName,BackupRow[]>};
export type ValidatedBackup={payload:KitchenBackup;sourceUri:string};

function assertBackup(value:unknown):KitchenBackup{
  if(!value||typeof value!=='object')throw new Error('This file is not a valid Recipe & Kitchen backup.');
  const data=value as Record<string,unknown>;
  if(data.format!=='recipe-kitchen-backup'||data.version!==1||!data.tables||typeof data.tables!=='object')throw new Error('Unsupported backup format or version.');
  const source=data.tables as Record<string,unknown>;
  for(const table of TABLES){const rows=source[table.name];if(!Array.isArray(rows))throw new Error(`Backup is missing the ${table.name} table.`);for(const row of rows){if(!row||typeof row!=='object'||typeof (row as Record<string,unknown>).id!=='string')throw new Error(`The ${table.name} table contains an invalid row.`);const keys=Object.keys(row as object);if(keys.some(key=>!(table.columns as readonly string[]).includes(key)))throw new Error(`The ${table.name} table contains an unexpected field.`);}}
  const tables=source as Record<TableName,BackupRow[]>;
  const ids=(name:TableName)=>new Set(tables[name].map(row=>String(row.id)));
  const categoryIds=ids('categories'),ingredientIds=ids('ingredients'),recipeIds=ids('recipes'),historyIds=ids('cooking_history');
  const valid=(id:unknown,set:Set<string>)=>id===null||id===undefined||set.has(String(id));
  if(tables.ingredients.some(row=>!valid(row.category_id,categoryIds))||tables.recipes.some(row=>!valid(row.category_id,categoryIds)))throw new Error('Backup contains a missing category reference.');
  if(tables.recipe_ingredients.some(row=>!recipeIds.has(String(row.recipe_id))||!ingredientIds.has(String(row.ingredient_id))))throw new Error('Backup contains an invalid recipe ingredient reference.');
  if(tables.recipe_steps.some(row=>!recipeIds.has(String(row.recipe_id))))throw new Error('Backup contains an invalid recipe instruction reference.');
  if(tables.inventory.some(row=>!ingredientIds.has(String(row.ingredient_id))))throw new Error('Backup contains an invalid inventory reference.');
  if(tables.shopping_items.some(row=>!valid(row.ingredient_id,ingredientIds)))throw new Error('Backup contains an invalid shopping item reference.');
  if(tables.cooking_history.some(row=>!valid(row.recipe_id,recipeIds)))throw new Error('Backup contains an invalid cooking history reference.');
  if(tables.cooking_deductions.some(row=>!historyIds.has(String(row.cooking_history_id))||!ingredientIds.has(String(row.ingredient_id))))throw new Error('Backup contains an invalid cooking deduction reference.');
  return value as KitchenBackup;
}

async function writeBackupFile(db:SQLiteDatabase):Promise<string>{
  if(!FileSystem.documentDirectory)throw new Error('App document storage is unavailable.');
  const tables={} as KitchenBackup['tables'];
  for(const table of TABLES){tables[table.name]=await db.getAllAsync<BackupRow>(`SELECT * FROM ${table.name}`);}
  const payload:KitchenBackup={format:'recipe-kitchen-backup',version:1,createdAt:new Date().toISOString(),tables};
  const uri=FileSystem.documentDirectory+`recipe-kitchen-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(uri,JSON.stringify(payload),{encoding:FileSystem.EncodingType.UTF8});
  return uri;
}

export async function createAndShareBackup(db:SQLiteDatabase):Promise<void>{
  const uri=await writeBackupFile(db);
  if(!await Sharing.isAvailableAsync())throw new Error('File sharing is not available on this device.');
  await Sharing.shareAsync(uri,{mimeType:'application/json',dialogTitle:'Save your Recipe & Kitchen backup'});
}

export async function pickAndValidateBackup():Promise<ValidatedBackup|null>{
  const result=await DocumentPicker.getDocumentAsync({type:['application/json','.json'],copyToCacheDirectory:true});
  if(result.canceled)return null;
  const asset=result.assets[0];
  const text=await FileSystem.readAsStringAsync(asset.uri,{encoding:FileSystem.EncodingType.UTF8});
  let parsed:unknown;
  try{parsed=JSON.parse(text);}catch{throw new Error('The selected file is not valid JSON.');}
  return {payload:assertBackup(parsed),sourceUri:asset.uri};
}

export async function restoreValidatedBackup(db:SQLiteDatabase,backup:ValidatedBackup):Promise<void>{
  const payload=assertBackup(backup.payload);
  await writeBackupFile(db); // Preserve a local pre-restore safety copy.
  await db.withTransactionAsync(async()=>{
    for(const table of [...TABLES].reverse())await db.execAsync(`DELETE FROM ${table.name}`);
    for(const table of TABLES){for(const row of payload.tables[table.name]){const columns=table.columns.filter(column=>Object.prototype.hasOwnProperty.call(row,column));const values=columns.map(column=>row[column]??null) as SQLiteBindValue[];if(columns.length===0)continue;const placeholders=columns.map(()=>'?').join(',');await db.runAsync(`INSERT INTO ${table.name} (${columns.join(',')}) VALUES (${placeholders})`,...values);}}
  });
}