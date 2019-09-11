var string = require('../bitcoin-consensus-encoding/string.js')
var int = require('../bitcoin-consensus-encoding/int.js')
const varint = require('../bitcoin-consensus-encoding/var-int.js')
const hash = require('../bitcoin-consensus-encoding/hash.js')
var assert = require('nanoassert')

const FieldTypes = {
  u8: 0x01,
  u16: 0x02,
  u32: 0x03,
  u64: 0x04,
  i8: 0x05,
  i16: 0x06,
  i32: 0x07,
  i64: 0x08,
  vi: 0x09,
  fvi: 0x0a,
  str: 0x0b,
  bytes: 0x0c,
  sha256: 0x10,
  sha256d: 0x11,
  ripmd160: 0x12,
  hash160: 0x13,
  outpoint: 0x20,
  soutpoint: 0x21,
  pubkey: 0x30,
  ecdsa: 0x31
}

const SealTypes = {
  none: 0x00,
  balance: 0x01,
  datagraph: 0x02
}

module.exports = {
  encode: encode,
  // decode: decode,
  // encodingLength: encodingLength
}

function encode (schema, buf, offset) {
  if (!buf) buf = Buffer.alloc(encodingLength(schema))
  if (!offset) offset = 0
  const startIndex = offset
  
  string.encode(schema.name, buf, offset)
  offset += string.encode.bytes

  const versionArray = schema.version.split('.')

  varint.encode(parseInt(versionArray[0]), buf, offset)
  offset += varint.encode.bytes

  buf.writeUInt8(parseInt(versionArray[1]), offset)
  offset++

  buf.writeUInt8(parseInt(versionArray[2]), offset)
  offset++

  let schemaHash = schema.prevSchema ? schema.prevSchema : Buffer.alloc(32)
  hash.encode(schemaHash, buf, offset)
  offset += hash.encode.bytes

  varint.encode(schema.fieldTypes.length, buf, offset)
  offset += varint.encode.bytes

  const fieldTypeIndex = {}
  let typeCounter = 0

  for (let field of schema.fieldTypes) {
    fieldTypeIndex[field.title] = typeCounter
    typeCounter++

    string.encode(field.title, buf, offset)
    offset += string.encode.bytes

    buf.writeUInt8(FieldTypes[field.type], offset)
    offset++
  }

  varint.encode(schema.sealTypes.length, buf, offset)
  offset += varint.encode.bytes

  const sealTypeIndex = {}
  let sealCounter = 0

  for (let seal of schema.sealTypes) {
    buf.writeUInt8(sealCounter, offset++)

    sealTypeIndex[seal.title] = sealCounter
    sealCounter++

    string.encode(seal.title, buf, offset)
    offset += string.encode.bytes
  }

  varint.encode(schema.proofTypes.length, buf, offset)
  offset += varint.encode.bytes

  for (let proof of schema.proofTypes) {
    string.encode(proof.name, buf, offset)
    offset += string.encode.bytes

    encodeTypeList(proof.fields, fieldTypeIndex, buf, offset)
    if (proof.unseals) {
      encodeTypeList(proof.unseals, sealTypeIndex, buf, offset)
    } else {
      buf.writeUInt8(0, offset)
    }
    encodeTypeList(proof.seals, sealTypeIndex, buf, offset)
  }

  encode.bytes = offset - startIndex
  return buf

  function encodeTypeList (list, types, buf, offset) {
    varint.encode(list.length, buf, offset)
    offset += varint.encode.bytes

    for (let item of list) {
      buf.writeUInt8(types[item.title], offset)
      offset++

      switch (item.value) {
        case 'optional' :
          buf.writeUInt8(0, offset++)
          buf.writeUInt8(1, offset++)
          break

        case 'single' :
          buf.writeUInt8(1, offset++)
          buf.writeUInt8(1, offset++)
          break

        case 'many' :
          buf.writeUInt8(1, offset++)
          int.encode(-1, buf, offset)
          offset += int.encode.bytes
          break
      }
    }
  }
}

function decode (buf, offset) {
  if (!offset) offset = 0
  const startIndex = offset

  const schema = {}

  schema.name = string.decode(buf, offset)
  offset += string.decode.bytes

  schema.version = []

  schema.version.push(varint.decode(buf, offset).toString(10))
  offset += varint.decode.bytes
  schema.version.push(buf.readUInt8(offset++).toString(10))
  schema.version.push(buf.readUInt8(offset++).toString(10))

  schema.version = String.join('.', schema.version)

  if (!Buffer.subarray(offset, offset + 32).compare(Buffer.alloc(32))) {
    schema.prevSchema = hash.decode(buf, offset, 32)
    offset += hash.decode.bytes
  } else {
    schema.prevSchema = 0
  }

  const fieldCounter = varint.decode(buf, offset)
  offset += varint.decode.bytes

  schema.fieldTypes = []
  const fieldTypeIndex = {}

  for (let i = 0; i < fieldCounter; i++) {
    const field = {}
    field.title = string.decode(buf, offset)
    offset += string.decode.bytes

    field.type = buf.readUInt8(offset++)
    Object.entries(FieldTypes).forEach([key, value] => {
      if (value === field.type) field.type = key
    })

    fieldTypeIndex[i] = field.title
    schema.fieldTypes.push(field)
  }

  const sealCounter = varint.decode(buf, offset)
  offset += varint.decode.bytes

  schema.sealTypes = []
  const sealTypeIndex = {}

  for (let i = 0; i < sealCounter; i++) {
    const seal = {}
    seal.title = string.decode(buf, offset)
    offset += string.decode.bytes

    seal.type = buf.readUInt8(offset++)
    Object.entries(SealTypes).forEach([key, value] => {
      if (value === seal.type) seal.type = key
    })

    sealTypeIndex[i] = seal.title
    schema.sealTypes.push(seal)
  }

  const proofCounter = varint.decode(buf, offset)
  offset += varint.decode.bytes

  schema.proofTypes = []

  for (let i = 0; i < proofCounter; i++) {
    const proof = {}

    proof.name = string.decode(buf, offset)
    offset += string.decode.bytes

    proof.fields = decodeTypeList(buf, offset, fieldTypeIndex)
    if (!buf.readUInt8(offset)) {
      offset++
    } else {
      proof.unseals = decodeTypeList(buf, offset, sealTypeIndex)
    }
    proof.seals = decodeTypeList(buf, offset, sealTypeIndex)

    schema.proofTypes.push(proof)
  }

  decode.bytes = offset - startIndex
  return schema

  function decodeTypeList (buf, offset, types) {
    const list = []

    const counter = varint.decode(buf, offset)
    offset += varint.decode.bytes

    for (let i = 0; i < counter; i++) {
      const item = {}

      item.title = types[buf.readUInt8(offset++)]

      item.value = {}
      item.value.minimum = int.decode(buf, offset++, 1, false)
      item.value.maximum = int.decode(buf, offset++, 1, false)

      list.push(item)
    }

    return list
  }
}

const test = {
  name: 'RGB',
  version: '1.0.0',
  prevSchema: 0,
  fieldTypes: [
    { title: 'ver', type: 'u8' },
    { title: 'schema', type: 'sha256' },
    { title: 'ticker', type: 'str' },
    { title: 'title', type: 'str' },
    { title: 'description', type: 'str' },
    { title: 'url', type: 'str' },
    { title: 'max_supply', type: 'fvi' },
    { title: 'dust_limit', type: 'vi' },
    { title: 'signature', type: 'ecdsa'}
  ],
  sealTypes: [
    { title: 'assets', type: 'balance' },
    { title: 'inflation', type: 'none' },
    { title: 'upgrade', type: 'none' },
    { title: 'pruning', type: 'none' }
  ],
  proofTypes: [
    {
      name: 'primary_issue',
      fields: [
        { title: 'ticker', value: 'optional' },
        { title: 'title', value: 'optional' },
        { title: 'description', value: 'optional' },
        { title: 'url', value: 'optional' },
        { title: 'max_supply', value: 'optional' },
        { title: 'dust_limit', value: 'single' },
        { title: 'signature', value: 'optional' }
      ],
      seals: [
        { title: 'assets', value: 'many' },
        { title: 'inflation', value: 'optional' },
        { title: 'upgrade', value: 'single' },
        { title: 'pruning', value: 'single' }
      ]
    },
    { 
      name: 'secondary_issue',
      unseals: [
        { title: 'inflation', value: 'single' }
      ],
      fields: [
        { title: 'url', value: 'optional' },
        { title: 'signature', value: 'optional' }
      ],
      seals: [
        { title: 'assets', value: 'many' },
        { title: 'inflation', value: 'optional' },
        { title: 'pruning', value: 'single' }
      ]
    },
    {
      name: 'upgrade_signal',
      unseals: [
        { title: 'upgrade', value: 'single' },
      ],
      fields: [
        { title: 'ver', value: 'single' },
        { title: 'schema', value: 'optional' },
        { title: 'signature', value: 'optional' },
      ],
      seals: [
        { title: 'upgrade', value: 'single' }
      ]
    },
    {
      name: 'history_prune',
      unseals: [
        { title: 'pruning', value: 'single' }
      ],
      fields: [],
      seals: [
        { title: 'assets', value: 'many' },
        { title: 'pruning', value: 'single' }
      ]
    },
    {
      name: 'asset_transfer',
      unseals: [
        { title: 'assets', value: 'many' }
      ],
      fields: [
        { title: 'ver', value: 'optional' }
      ],
      seals: [
        { title: 'assets', value: 'any' }
      ]
    }
  ]
}

let testBuf = Buffer.alloc(300)

console.log(encode(test, testBuf))