var string = require('../bitcoin-consensus-encoding/lib/string.js')
var int = require('../bitcoin-consensus-encoding/lib/int.js')
var assert = require('nanoassert')
var header = require('./proof-header.js')
var seals = require('./seals.js')
var state = require('./state.js')
var metadata = require('./metadata')

module.exports = {
  encode: encode,
  // decode: decode,
  // encodingLength: encodingLength
}

function encode (proof, schema, buf, offset) {
  if (!buf) buf = Buffer.alloc(encodingLength(proof, schema))
  if (!offset) offset = 0
  const startIndex = offset

  header.encode(proof, buf, offset)
  offset += header.encode.bytes
  
  let proofTypeIndex = schema.proofTypes.findIndex((item) =>
    item.name === proof.type)
  buf.writeUInt8(proofTypeIndex, offset)
  offset++

  seals.encode(proof.seals, buf, offset)
  offset += seals.encode.bytes

  state.encode(proof, schema, buf, offset)
  offset += state.encode.bytes

  metadata.encode(proof, schema, buf, offset)
  offset += metadata.encode.bytes

  encode.bytes = offset - startIndex
  return buf
}

function decode (buf, offset, schema) {
  assert(schema, 'schema is required') // TODO : only parse seals
  if (!offset) offset = 0
  const startIndex = offset

  const proof = {}
  header.decode(buf, offset, proof)
  offset += header.decode.bytes

  let proofTypeIndex = buf.readUInt8(offset++)
  proof.type = schema.proofTypes[proofTypeIndex].name

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

  length++

  length += header.encodingLength(proof)
  length += seals.encodingLength(proof.seals)
  length += state.encodingLength(proof, schema)
  length += metadata.encodingLength(proof, schema)

  return length
}

const testProof = {
  ver: 1,
  format: 'root',
  schema: 'sm19au5tw58z34aejm6hcjn5fnlvu2pdunq2vux5ymzks33yffrazxs0wtqdf',
  network: 'testnet',
  root: '5700bdccfc6209a5460dc124403eed6c3f5ba58da0123b392ab0b1fa23306f27:4',
  type: 'primary_issue',
  fields: {
    title: 'Private Company Ltd Shares',
    ticker: 'PLS',
    dust_limit: 1
  },
  seals: [
    {
      type: 'assets',
      outpoint: '5700bdccfc6209a5460dc124403eed6c3f5ba58da0123b392ab0b1fa23306f27:0',
      amount: 1000000
    },
    {
      type: 'inflation',
      outpoint: '5700bdccfc6209a5460dc124403eed6c3f5ba58da0123b392ab0b1fa23306f27:1'
    },
    {
      type: 'upgrade',
      outpoint: '5700bdccfc6209a5460dc124403eed6c3f5ba58da0123b392ab0b1fa23306f27:3'
    },
    {
      type: 'pruning',
      outpoint: '5700bdccfc6209a5460dc124403eed6c3f5ba58da0123b392ab0b1fa23306f27:2'
    }
  ],
  pubkey: '0262b06cb205c3de54717e0bc0eab2088b0edb9b63fab499f6cac87548ca205be1'
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

console.log(decode(encode(testProof, test), null, test))