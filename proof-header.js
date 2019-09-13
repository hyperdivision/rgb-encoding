var string = require('../bitcoin-consensus-encoding/string.js')
var int = require('../bitcoin-consensus-encoding/int.js')
var bool = require('../bitcoin-consensus-encoding/boolean.js')
var btcOutpoint = require('../bitcoin-consensus-encoding/outpoint.js')
var fvi = require('../bitcoin-consensus-encoding/flag-var-int.js')
var outpoint = require('./outpoint.js')
var assert = require('nanoassert')

module.exports = {
  encode,
  decode,
  encodingLength
} 

function encode (proof, buf, offset) {
  if (!buf) buf = Buffer.alloc(encodingLength(contract))
  if (!offset) offset = 0

  const fver = {}
  fver.value = proof.version
  if (contract.type !== ordinary) {
    fver.flag = true


}

function decode (buf, offset) {
  if (!offset) offset = 0
  const proof = {}

  const fversion = fvi.decode(buf, offset)
  offset += fvi.decode.bytes

  if (fversion.flag) {
    const schemaId = buf.subarray(offset, offset + 32)
    offset += 32

    const fnetwork = fvi.decode(offset)
    offset += fvi.decode.bytes

    if (fnetwork.flag) {
      proof.network = fnetwork.value
      proof.format = ProofFormat.root ???
      proof.schemaId = schemaId

      if (schemaId.compare(Buffer.alloc(32))) {
        throw new Error('no schema in root proof')
      }

      proof.outpoint = btcOutpoint.decode(buf.offset)
      offset += btcOutpoint.decode.bytes
    } else {
      if (fnetwork.value !== 0) {
        throw new Error('network cannot be changed in root proof')
      }

      proof.format = ProofFormat.upgrade ???
    }
  } else {
    proof.format = ProofFormat.ordinary

    try {
      const fseals = fvi.decode(buf, offset)
      offset += fvi.decode.bytes
    } catch {
      proof.format = ProofFormat.stateDestruction
    }
  }
}