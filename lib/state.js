const EncodingTypes = require('././field-encodings.json')
const btc = require('bitcoin-consensus-encoding')
const varint = btc.varint
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

  varint.encode(encodingLength.dataLength, buf, offset)
  offset += varint.encode.bytes

  const proofType = schema.proofTypes.find((type) =>
    type.name === proof.type)

  // must verify that necessary seals are there
  for (const [key, value] of Object.entries(proofType.seals)) {
    const matchingSealTypes = proof.seals.filter((seal) => seal.type === value)
    if (value === 'many') assert(matchingSealTypes.length > 0,
      `${key} seal required`)
    if (value === 'optional') assert(matchingSealTypes.length <= 1,
      `cannot be more than one ${key} seal`)
    if (value === 'single') assert(matchingSealTypes.length = 1,
      `${key} seal must be unique`)
  }

  for (const seal of proof.seals) {
    // find expected state format from schema
    const sealType = proofType.seals.find((item) =>
      item.title === seal.type)

    const sealInfo = schema.sealTypes.find((type) =>
      type.title === sealType.title)

    // if 'none' skip this seal
    if (sealInfo.type === 'none') continue

    // otherwise, encode each field according to the corresponding data type
    const fields = Object.keys(sealInfo.type)

    for (const field of fields) {
      const dataType = sealInfo.type[field]
      const encoding = EncodingTypes[dataType].encoding

      btc[encoding].encode(seal[field], buf, offset)
      offset += btc[encoding].encode.bytes
    }
  }

  encode.bytes = offset - startIndex
  return buf
}

function decode (buf, offset, proof, schema) {
  assert(schema, 'schema must be specified')
  assert(proof, 'proof must be given')

  if (!offset) offset = 0
  const startIndex = offset

  const dataLength = varint.decode(buf, offset)
  offset += varint.decode.bytes

  const dataStart = offset

  const proofType = schema.proofTypes.find((type) =>
    type.name === proof.type)

  for (const seal of proof.seals) {
    // at this point seal.type is u8 index referring to proofType.seals
    const sealType = proofType.seals[seal.type] // eg assets
    const sealInfo = schema.sealTypes.find((type) =>
      type.title === sealType.title)

    if (sealInfo.type === 'none') continue

    for (const property of Object.keys(sealInfo.type)) {
      const dataType = sealInfo.type[property]
      const encoding = EncodingTypes[dataType].encoding
      const decodeOpts = EncodingTypes[dataType].decodeOpts
      const opts = decodeOpts.length > 0 ? decodeOpts : false

      seal[property] = btc[encoding].decode(buf, offset, opts)
      offset += btc[encoding].decode.bytes

      // console.log(encoding, btc[encoding].decode.bytes)
    }
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

  for (const seal of proof.seals) {
    // find expected state format from schema
    const sealType = proofType.seals.find((item) =>
      item.title === seal.type)

    const sealInfo = schema.sealTypes.find((type) =>
      type.title === sealType.title)

    // if 'none' skip this seal
    if (sealInfo.type === 'none') continue

    // otherwise, encode each field according to the corresponding data type
    const fields = Object.keys(sealInfo.type)

    for (const field of fields) {
      const dataType = sealInfo.type[field]
      const encoding = EncodingTypes[dataType].encoding

      length += btc[encoding].encodingLength(seal[field])
    }
  }

  encodingLength.dataLength = length
  length += varint.encodingLength(length)
  return length
}

// const proof = {}
// proof.type = 'primary_issue'
// proof.seals = [{
//     type: 'assets',
//     outpoint: '5700bdccfc6209a5460dc124403eed6c3f5ba58da0123b392ab0b1fa23306f27:0',
//     amount: 1000000
//   }]

// const schema = {}
// schema.proofTypes = []
// const testType = {}
// testType.name = 'primary_issue'
// testType.seals = [
//   { title: 'assets', value: 'many' },
//   { title: 'inflation', value: 'optional' },
//   { title: 'upgrade', value: 'single' },
//   { title: 'pruning', value: 'single' }
// ]
// schema.proofTypes.push(testType)

// console.log(decode(encode(proof, schema), null, schema, proof))
