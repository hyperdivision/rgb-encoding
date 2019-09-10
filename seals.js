const outpoint = require('../bitcoin-consensus-encoding/outpoint.js')
const string = require('../bitcoin-consensus-encoding/string.js')
const int = require('../bitcoin-consensus-encoding/int.js')
const bool = require('../bitcoin-consensus-encoding/boolean.js')
const fvi = require('../bitcoin-consensus-encoding/flag-var-int.js')
const assert = require('nanoassert')

module.exports = {
  encode,
  decode,
  encodingLength
}

function encode (seals, buf, offset) {
  if (!buf) buf = Buffer.alloc(encodingLength(seals))
  if (!offset) offset = 0
  const startIndex = offset

  let sealType

  for (let seal of seals) {
    if (sealType === undefined) sealType = seal.type
    if (seal.type !== sealType) {
      sealType = seal.type

      buf.writeUInt8(0x7f, offset)
      offset++
    }

    const fver = {}
    fver.value = seal.vout
    fver.flag = !(!seal.txid)

    fvi.encode(fver, buf, offset)
    offset += fvi.encode.bytes

    if (seal.txid) {
      let txidBytes = Buffer.from(seal.txid, 'hex')
      buf.set(txidBytes, offset)
      offset += txidBytes.byteLength
    }
  }

  buf.writeUInt8(0xff, offset)
  offset++

  encode.bytes = offset - startIndex
  return buf
}

function decode (buf, offset) {
  if (!offset) offset = 0
  const startIndex = offset

  const seals = []
  let typeCounter = 0

  while (true) {
    const seal = {}
    const fvout = fvi.decode(buf, offset)
    offset += fvi.decode.bytes

    seal.vout = fvout.value
    seal.type = typeCounter

    if (fvout.value === 0x7f) {
      if (fvout.flag) break
      typeCounter++
    }
    if (fvout.flag) {
      seal.txid = buf.subarray(offset, offset + 32).toString('hex')
      offset += 32
    }

    seals.push(seal)
  }

  decode.bytes = offset - startIndex
  return seals
}

function encodingLength (seals) {
  let length = 0
  let sealType

  for (let seal of seals) {
    if (!sealType) sealType = seal.type
    if (sealType && seal.type !== sealType) {
      length++
    }

    const fver = {}
    fver.value = seal.vout
    fver.flag = !(!seal.txid)

    length += fvi.encodingLength(fver)

    if (seal.txid) length += 32
  }
  
  return length + 1
}

test = []

for (let i = 0; i < 10; i++) {
  const seal = {}
  seal.type = Math.floor(i / 3)
  seal.vout = i
  if (i % 3 === 0) seal.txid = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  test.push(seal)
  console.log(seal)
}

let encoded = encode(test)
console.log(encoded)
console.log(decode(encoded))
