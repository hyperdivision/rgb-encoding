var string = require('../bitcoin-consensus-encoding/string.js')
var int = require('../bitcoin-consensus-encoding/int.js')
var varint = require('../bitcoin-consensus-encoding/var-int.js')

module.exports = {
  encode: encode,
  decode,
  encodingLength
}

function encode (outpoint, buf, offset) {
  
  if (!buf) buf = Buffer.alloc(encodingLength(outpoint))
  if (!offset) offset = 0
  var oldOffset = offset
  switch (outpoint.type) {
    case 'UTXO' :
      buf.writeUInt8(1, offset)
      offset++

      string.encode(outpoint.address, buf, offset, true)
      offset += string.encode.bytes
      break

    case 'address' :
      buf.writeUInt8(2, offset)
      offset++

      buf.writeUInt16BE(outpoint.address, offset)
      offset += 2
      break

    default :
      throw new Error('outpoint type must be specified.')
  }

  encode.bytes = offset - oldOffset
  return buf
}

function decode (buf, offset) {
  if (!offset) offset = 0
  var oldOffset = offset
  var outpoint = {}
  var type = buf.readUInt8(offset)
  offset++

  switch (type) {
    case 1 :
      outpoint.type = 'UTXO'
      outpoint.address = buf.subarray(offset, offset + 32).toString('hex')
      offset += 32
      break

    case 2 :
      outpoint.type = 'address'
      outpoint.address = buf.readUInt16BE(offset)
      offset += 2
      break
  }

  decode.bytes = offset - oldOffset
  return outpoint
}

function encodingLength (outpoint) {
  if (outpoint.type === 'UTXO') return 33
  if (outpoint.type === 'address') return 3

  throw new Error('outpoint type not recognised.')
}

// var outpoint = {
//   type: 'UTXO',
//   address: '49cafdbc3e9133a75b411a3a6d705dca2e9565b660123b6535babb7567c28f02'
// }

// console.log(decode(encode(outpoint)))
let test = {
  'type': "address",
  'address': 3
}
