const header = require('./header')
const body = require('./body')
const metadata = require('./metadata')
const assert = require('nanoassert')
const pubkey = require('bitcoin-consensus-encoding').pubkey

module.exports = {
  encode,
  decode,
  encodingLength
}
// TODO: prunable data serialisation

function encode (proof, schema, buf, offset) {
  assert(schema, 'schema is required')
  if (!buf) buf = Buffer.alloc(encodingLength(proof, schema))
  if (!offset) offset = 0
  const startIndex = offset

  header.encode(proof, buf, offset)
  offset += header.encode.bytes

  body.encode(proof, schema, buf, offset)
  offset += body.encode.bytes

  if (proof.pubkey) {
    pubkey.encode(proof.pubkey, buf, offset)
    offset += pubkey.encode.bytes
  } else {
    buf.writeUInt8(0, offset++)
  }

  encode.bytes = offset - startIndex
  return buf
}

function decode (buf, offset, schema, proof) {
  assert(schema, 'schema is required') // TODO : only parse seals
  offset = offset || 0
  proof = proof || {}
  const startIndex = offset

  header.decode(buf, offset, proof)
  offset += header.decode.bytes

  body.decode(buf, offset, schema, proof)
  offset += body.decode.bytes

  for (const seal of proof.seals) {
    seal.type = schema.sealTypes[seal.type].title
  }

  if (buf.readUInt8(offset)) {
    proof.pubkey = pubkey.decode(buf, offset).raw.toString('hex')
    offset += pubkey.decode.bytes
  } else {
    offset++
  }

  decode.bytes = offset - startIndex
  return proof
}

function encodingLength (proof, schema) {
  assert(schema, 'schema must be known')
  let length = 0

  length += header.encodingLength(proof)
  length += body.encodingLength(proof, schema)

  if (proof.pubkey) {
    length += pubkey.encodingLength(proof.pubkey)
  } else {
    length++
  }

  return length
}

const rootProof = {
  ver: 1,
  format: 'root',
  schema: 'sm1m3pkuxxyl0rp3e6drhlhw40f8uhg0xx9qem57jq32dhxmzzfgvpsgvqvjw',
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
      txid: '9db9396ecb4b1dbe8c6fca1f7cc9f6d945ab6dc2c14ca6d9ac8ffbf17c5babac',
      vout: 0,
      ticker: 'PLS',
      amount: 1000000
    },
    {
      type: 'inflation',
      txid: '795f71a8be38f8baee18fa27ee90262b395ca3bd9214c10ffe76133882f504fb',
      vout: 0
    },
    {
      type: 'upgrade',
      txid: 'ab7672e5cb084005a85b447c52a15d97ea8ec047e1b20dc4c3ec91e1fb0584fc',
      vout: 0
    },
    {
      type: 'pruning',
      txid: 'a9fc4d1f30550df12cf6cee0adbff2ea37e0c908afac8ccfa984afa24c8fd1f9',
      vout: 0
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
    { title: 'assets', 
      type: {
        'ticker': 'str',
        'amount': 'vi'
      }
    },
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

// console.log(decode(encode(rootProof, test), null, test))
// console.log(encode(testProof, test).toString('hex'))
// console.log(decode(encode(testProof, test), null, test))
// UNCOMMENT FOR BEHC32 PROOF HASH

// const bech32 = require('bech32')
// const sodium = require('sodium-native')
// const encoded = encode(testProof, test)
// console.log(encoded.toString('hex'))
// let hash = Buffer.alloc(sodium.crypto_hash_sha256_BYTES)
// sodium.crypto_hash_sha256(hash, encoded)
// let words = bech32.toWords(hash)
// console.log(bech32.encode('pf', words))
