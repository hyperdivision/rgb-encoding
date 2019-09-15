var string = require('../bitcoin-consensus-encoding/lib/string.js')
var int = require('../bitcoin-consensus-encoding/lib/int.js')
var bool = require('../bitcoin-consensus-encoding/lib/boolean.js')
var outpoint = require('../bitcoin-consensus-encoding/lib/outpoint.js')
var fvi = require('../bitcoin-consensus-encoding/lib/flag-var-int.js')
const hash = require('../bitcoin-consensus-encoding/lib/hash')
var assert = require('nanoassert')
const bech32 = require('bech32')

module.exports = {
  encode,
  decode,
  encodingLength
}

const networks = {
  mainnet: 0x01,
  testnet: 0x02,
  regtest: 0x03,
  signet: 0x04,
  liquid: 0x10
}

function encode (proof, buf, offset) {
  if (!buf) buf = Buffer.alloc(encodingLength(proof))
  if (!offset) offset = 0
  var startIndex = offset
  
  const fver = {}
  const fnetwork = {}

  fver.value = proof.ver
  
  switch (proof.format) {
    case 'root' :
      fver.flag = true
      fvi.encode(fver, buf, offset)
      offset += fvi.encode.bytes

      const schemaWords = bech32.decode(proof.schema).words
      const schemaHex = bech32.fromWords(schemaWords)

      hash.encode(schemaHex, buf, offset)
      offset += hash.encode.bytes

      fnetwork.flag = true
      fnetwork.value = networks[proof.network]

      fvi.encode(fnetwork, buf, offset)
      offset += fvi.encode.bytes

      const root = {}
      root.txid = proof.root.split(':')[0]
      root.vout = proof.root.split(':')[1]

      outpoint.encode(root, buf, offset)
      offset += outpoint.encode.bytes
      break

    case 'upgrade' :
      fver.flag = true
      fvi.encode(fver, buf, offset)
      offset += fvi.encode.bytes

      const schema = Buffer.alloc(32)
      if (proof.schemaUpgrade) schema = proof.schema
      
      hash.encode(schema, buf, offset)
      offset += hash.encode.bytes
      
      fnetwork.flag = false
      fnetwork.value = 0
      
      fvi.encode(fnetwork, buf, offset)
      offset += fvi.encode.bytes
      break

    case 'ordinary' : case 'stateDestruction' :
      fver.flag = false
      
      fvi.encode(fver, buf, offset)
      offset += fvi.encode.bytes
      break
  }

  encode.bytes = offset - startIndex
  return buf
}


function decode (buf, offset, proof) {
  if (!proof) proof = {}
  if (!offset) offset = 0
  const startIndex = offset

  const fversion = fvi.decode(buf, offset)
  offset += fvi.decode.bytes

  if (fversion.flag) {
    const schemaRaw = buf.subarray(offset, offset + 32)
    offset += 32

    const fnetwork = fvi.decode(buf, offset)
    offset += fvi.decode.bytes

    if (fnetwork.flag) {
      proof.network = fnetwork.value
      proof.format = 'root'

      if (!schemaRaw.compare(Buffer.alloc(32))) {
        throw new Error('no schema in root proof')
      }

      const schemaWords = bech32.toWords(schemaRaw)
      const schemaId = bech32.encode('sm', schemaWords)
      proof.schema = schemaId

      proof.root = Object.values(outpoint.decode(buf, offset)).join(':')
      offset += outpoint.decode.bytes
    } else {
      if (fnetwork.value !== 0) {
        throw new Error('network cannot be changed in root proof')
      }

      proof.format = 'upgrade'
      if (!schemaRaw.compare(Buffer.alloc(32))) {
        const schemaWords = bech32.toWords(schemaRaw)
        const schemaId = bech32.encode('sm', schemaWords)
        proof.schema = schemaId
      }
    }
  } else {
    proof.format = 'ordinary'

    if (fvi.decode(buf, offset + 1).flag) {
      proof.format = 'stateDestruction'
    }
  }

  decode.bytes = offset - startIndex
  return proof
}

// TODO:: encodingLength : 34 -- offset 38
function encodingLength (proof) {
  var length = 0

  const fver = {}
  fver.value = proof.ver
  length += fvi.encodingLength(fver)
  
  switch (proof.format) {
    case 'root' :
      const schemaWords = bech32.decode(proof.schema).words
      const schemaHex = bech32.fromWords(schemaWords)

      length += hash.encodingLength(Buffer.from(schemaHex, 'hex'))
      length += fvi.encodingLength({ value: networks[proof.network] })

      const root = {}
      root.txid = proof.root.split(':')[0]
      root.vout = proof.root.split(':')[1]

      length += outpoint.encodingLength(root)
      break

    case 'upgrade' :
      length += fvi.encodingLength(fver)

      const schema = Buffer.alloc(32)
      length += hash.encodingLength(schema)

      length += fvi.encodingLength({ value: 0 })
      break

    case 'ordinary' : case 'stateDestruction' :
      length += fvi.encodingLength(fver)
      break
  }

  return length
}
