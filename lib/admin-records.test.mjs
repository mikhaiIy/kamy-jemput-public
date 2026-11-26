import assert from 'node:assert/strict'
import test from 'node:test'
import {loadAdminPages} from './admin-records.ts'

test('admin lists include records beyond the database page limit using a stable two-field cursor',async()=>{
 const first=Array.from({length:1000},(_,i)=>({id:String(1000-i).padStart(5,'0'),created_at:'2026-09-05T00:00:00Z'}))
 const seen=[]
 const result=await loadAdminPages(async cursor=>{seen.push(cursor);return {data:cursor?[{id:'00000',created_at:'2026-09-04T00:00:00Z'}]:first,error:null}})
 assert.equal(result.data.length,1001)
 assert.deepEqual(seen,[null,'created_at.lt.2026-09-05T00:00:00Z,and(created_at.eq.2026-09-05T00:00:00Z,id.lt.00001)'])
 assert.equal(result.data.at(-1).id,'00000')
})
test('a later query failure cannot appear as a successful partial list',async()=>{
 let calls=0
 const result=await loadAdminPages(async()=>++calls===1?{data:Array.from({length:1000},(_,i)=>({id:String(i),created_at:'2026-09-05'})),error:null}:{data:null,error:{message:'unavailable'}})
 assert.deepEqual(result.data,[])
 assert.equal(result.error.message,'unavailable')
})
