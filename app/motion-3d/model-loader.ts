/** Gzip is explicit so model compression does not depend on an edge server's MIME rules. */
export async function fetchModel(compressed:string,fallback:string,signal?:AbortSignal):Promise<ArrayBuffer>{
  const canDecompress=typeof DecompressionStream!=="undefined";
  const response=await fetch(canDecompress?compressed:fallback,{signal,mode:"cors",credentials:"same-origin"});
  if(!response.ok)throw new Error(`Model request failed (${response.status})`);
  const bytes=await response.arrayBuffer();
  // Some hosts may already decompress based on Content-Encoding. Accept either representation.
  const header=new Uint8Array(bytes,0,Math.min(2,bytes.byteLength));
  if(header[0]!==0x1f||header[1]!==0x8b)return bytes;
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}
