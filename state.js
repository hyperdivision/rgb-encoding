const varint = require('../bitcoin-consensus-encoding/lib/var-int.js')
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

  for (seal of proof.seals) {
    let sealType = proofType.seals.find((item) => item.title === seal.type)

    switch (sealType.value) {
      case 'many' :
        varint.encode(seal.amount, buf, offset)
        offset += varint.encodingLength(seal.amount)
        break

      case 'any' :
        if (seal.amount) {
          varint.encode(seal.amount, buf, offset)
          offset += varint.encodingLength(seal.amount)
        } else {
          buf.writeUInt8(0x0, offset++)
        }
        break
    }
  }

  encode.bytes = offset - startIndex
  return buf
}

function decode (buf, offset, proof, schema) {
  assert(schema, 'schema must be specified')
  assert(proof, 'proof must be given')

  console.log(proof)
  if (!offset) offset = 0
  const startIndex = offset
  
  const dataLength = varint.decode(buf, offset)
  offset += varint.decode.bytes
  const dataStart = offset

  const proofType = schema.proofTypes.find((type) =>
    type.name === proof.type)

  for (let i = 0; i < proof.seals.length; i++) {
    const sealType = proofType.seals[proof.seals[i].type]

    switch (sealType.value) {
      case 'many' : case 'any' :
        if (!buf.readUInt8(offset)) {
          offset++
          break
        }
        proof.seals[i].amount = varint.decode(buf, offset)
        offset += varint.decode.bytes
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

  for (seal of proof.seals) {
    let sealType = proofType.seals.find((item) => item.title === seal.type)

    if (sealType.value ===  'any' || sealType.value === 'many') {
      if (!(!seal.amount)) {
        length += varint.encodingLength(seal.amount)
      } else {
        length++
      }
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