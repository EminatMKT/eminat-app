import {describe,expect,it,vi} from 'vitest'
vi.mock('@/shared/db/supabaseAdmin',()=>({supabaseAdmin:vi.fn()}))
import {readMetaInput} from './input'
describe('Meta input byte boundary',()=>{
 it('accepts a multiple-asset payload above the former 2 KiB cap',async()=>{
  const body=JSON.stringify({assetIds:Array.from({length:100},(_,n)=>`f0000000-0000-4000-8000-${String(n).padStart(12,'0')}`)})
  expect(body.length).toBeGreaterThan(2048)
  expect(await readMetaInput(new Request('https://example.invalid',{method:'POST',body}))).toHaveProperty('assetIds')
 })
 it('rejects oversized chunked JSON without trusting content-length',async()=>{
  await expect(readMetaInput(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({data:'x'.repeat(17000)})}))).rejects.toThrow('META_INPUT_TOO_LARGE')
 })
})
