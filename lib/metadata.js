const FieldTypes = require('././field-encodings.json')
const btc = require('bitcoin-consensus-encoding')
const assert = require('nanoassert')

module.exports = {
  encode,
  decode,
  encodingLength
}

function encode (proof, schema, buf, offset) {
  const encodedLength = encodingLength(proof, schema)
  if (!buf) buf = Buffer.alloc(encodedLength)
  if (!offset) offset = 0
  const startIndex = offset

  btc.varint.encode(encodingLength.dataLength, buf, offset)
  offset += btc.varint.encode.bytes

  const proofType = schema.proofTypes.find((type) =>
    type.name === proof.type)

  for (field of proofType.fields) {
    const fieldInfo = schema.fieldTypes.find((entry) =>
      entry.title === field.title)
    const encoding = FieldTypes[fieldInfo.type].encoding

    if (proof.fields[field.title]) {
      btc[encoding].encode(proof.fields[field.title], buf, offset)
      offset += btc[encoding].encode.bytes
    } else {
      if (fieldInfo.type === 'fvi') {
        buf.writeUInt8(0xff, offset++)
      } else {
        buf.writeUInt8(0, offset++)
      }
    }
  }

  encode.bytes = offset - startIndex
  return buf
}

function decode (buf, offset, proof, schema) {
  assert(schema, 'proof schema must be known')
  assert(proof, 'proof must be provided')

  proof.fields = {}
  
  if (!offset) offset = 0
  const startIndex = offset
  
  const dataLength = btc.varint.decode(buf, offset)
  offset += btc.varint.decode.bytes
  const dataStart = offset

  const proofType = schema.proofTypes.find((type) =>
    type.name === proof.type)

  for (field of proofType.fields) {
    const fieldInfo = schema.fieldTypes.find((entry) =>
      entry.title === field.title)
    const encoding = FieldTypes[fieldInfo.type].encoding
    const opts = FieldTypes[fieldInfo.type].decodeOpts

    if (buf.readUInt8(offset) === 0) {
      offset++
      continue
    } else if (encoding === 'fvi' && buf.readUInt8(offset) === 0xff) {
      offset++
      continue
    }

    proof.fields[field.title] = btc[encoding].decode(buf, offset, ...opts)
    offset += btc[encoding].decode.bytes
  }

  assert(offset - dataStart === dataLength,
    'too few bytes read while parsing state data')

  decode.bytes = offset - startIndex
  return proof
}

function encodingLength (proof, schema) {
  let length = 0

  const proofType = schema.proofTypes.find((type) =>
    type.name === proof.type)

  for (field of proofType.fields) {
    const fieldInfo = schema.fieldTypes.find((entry) =>
      entry.title === field.title)
    const encoding = FieldTypes[fieldInfo.type].encoding

    if (proof.fields[field.title]) {
      length += btc[encoding].encodingLength(proof.fields[field.title])
    } else {
      length++
    }
  }
 
  encodingLength.dataLength = length

  length += btc.varint.encodingLength(length)
  return length
}
