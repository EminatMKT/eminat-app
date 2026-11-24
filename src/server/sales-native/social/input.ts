import { NativeSalesAuthError } from '../auth'
export async function readMetaInput(request: Request) {
  const reader=request.body?.getReader()
  if(!reader)throw new NativeSalesAuthError(400,'INVALID_JSON')
  const chunks:Uint8Array[]=[];let size=0
  while(true){
    const {value,done}=await reader.read();if(done)break
    size+=value.byteLength
    if(size>16384){await reader.cancel();throw new NativeSalesAuthError(413,'META_INPUT_TOO_LARGE')}
    chunks.push(value)
  }
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown}
  catch{throw new NativeSalesAuthError(400,'INVALID_JSON')}
}
