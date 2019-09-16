var string = require('bitcoin-consensus-encoding').string
var int = require('bitcoin-consensus-encoding').int
var assert = require('nanoassert')
var seals = require('./seals.js')
var state = require('./state.js')
var metadata = require('./metadata')

module.exports = {
  encode: encode,
  decode: decode,
  encodingLength: encodingLength
}

function encode (proof, schema, buf, offset) {
  if (!buf) buf = Buffer.alloc(encodingLength(proof, schema))
  if (!offset) offset = 0
  const startIndex = offset

  let proofTypeIndex = schema.proofTypes.findIndex((item) =>
    item.name === proof.type)
  buf.writeUInt8(proofTypeIndex, offset)
  offset++

  if (proofTypeIndex !== 0) {
    seals.encode(proof.unseals, buf, offset)
    offset += seals.encode.bytes
  } else {
    if (proof.unseals) throw new Error('root proofs must have no unseals')
  }

  seals.encode(proof.seals, buf, offset)
  offset += seals.encode.bytes

  state.encode(proof, schema, buf, offset)
  offset += state.encode.bytes

  metadata.encode(proof, schema, buf, offset)
  offset += metadata.encode.bytes

  encode.bytes = offset - startIndex
  return buf
}

function decode (buf, offset, schema, proof) {
  assert(schema, 'schema is required') // TODO : only parse seals
  offset = offset || 0
  proof = proof || {}
  const startIndex = offset

  let proofTypeIndex = buf.readUInt8(offset++)
  proof.type = schema.proofTypes[proofTypeIndex].name

  if (proofTypeIndex !== 0) {
    proof.unseals = seals.decode(buf, offset)
    offset += seals.decode.bytes
  }

  proof.seals = seals.decode(buf, offset)
  offset += seals.decode.bytes

  state.decode(buf, offset, proof, schema)
  offset += state.decode.bytes

  metadata.decode(buf, offset, proof, schema)
  offset += metadata.decode.bytes

  decode.bytes = offset - startIndex
  return proof
}

function encodingLength (proof, schema) {
  assert(schema, 'schema must be known')

  let length = 0

  let proofTypeIndex = schema.proofTypes.findIndex((item) =>
    item.name === proof.type)

  length++

  if (proofTypeIndex !== 0) {
    length += seals.encodingLength(proof.unseals)
  }

  length += seals.encodingLength(proof.seals)
  length += state.encodingLength(proof, schema)
  length += metadata.encodingLength(proof, schema)

  return length
}
