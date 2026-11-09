export function decodeHex(value: string) {
  const v=value.trim().replace(/^0x/i,'');
  if(!/^[0-9a-fA-F]{1,8}$/.test(v))return null;
  const hex=v.toUpperCase().padStart(8,'0');
  return {hex,bytes:hex.match(/.{2}/g)!,value:parseInt(hex,16)};
}
