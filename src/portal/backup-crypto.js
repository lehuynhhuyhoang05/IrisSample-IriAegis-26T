const iterations = 210000
const encode = bytes => {
  let text = ''
  for (let i = 0; i < bytes.length; i += 32768) text += String.fromCharCode(...bytes.subarray(i, i + 32768))
  return btoa(text)
}
const decode = value => Uint8Array.from(atob(value), char => char.charCodeAt(0))
async function keyFor(password, salt, usages) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, usages)
}
export async function encryptBackup(backup, password) {
  if (password.length < 8) throw new Error('Mật khẩu file sao lưu cần ít nhất 8 ký tự.')
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await keyFor(password, salt, ['encrypt'])
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(backup)))
  return { format: 'iriaegis-web-encrypted', version: 1, algorithm: 'AES-GCM', kdf: 'PBKDF2-SHA256', iterations, salt: encode(salt), iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) }
}
export async function decryptBackup(envelope, password) {
  if (envelope?.format !== 'iriaegis-web-encrypted') return envelope
  if (envelope.version !== 1 || envelope.algorithm !== 'AES-GCM' || envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== iterations || !password) throw new Error('Nhập mật khẩu của file sao lưu được hỗ trợ.')
  try {
    const salt = decode(envelope.salt), iv = decode(envelope.iv)
    if (salt.length !== 16 || iv.length !== 12) throw new Error('Invalid envelope')
    const key = await keyFor(password, salt, ['decrypt'])
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, decode(envelope.ciphertext))
    return JSON.parse(new TextDecoder().decode(plaintext))
  } catch { throw new Error('Sai mật khẩu sao lưu hoặc file đã hỏng.') }
}
