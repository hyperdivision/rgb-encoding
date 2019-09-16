const outpoint = require('bitcoin-consensus-encoding').outpoint
const string = require('bitcoin-consensus-encoding').string
const int = require('bitcoin-consensus-encoding').int
const bool = require('bitcoin-consensus-encoding').boolean
const fvi = require('bitcoin-consensus-encoding').fvi
const assert = require('nanoassert')

module.exports = {
  encode,
  decode,
  encodingLength
}

function encode (seals, buf, offset) {
  if (!buf) buf = Buffer.alloc(encodingLength(seals))
  if (!offset) offset = 0
  const startIndex = offset

  if (seals.length !== 0) {
    let sealType

    for (let seal of seals) {
      if (sealType === undefined) sealType = seal.type
      if (seal.type !== sealType) {
        sealType = seal.type

        buf.writeUInt8(0x7f, offset)
        offset++
      }

      seal.info = seal.outpoint.split(':')

      const fver = {}
      fver.value = seal.info[1]
      fver.flag = (!(!seal.outpoint))

      fvi.encode(fver, buf, offset)
      offset += fvi.encode.bytes

      if (seal.outpoint) {
        let txidBytes = Buffer.from(seal.info[0], 'hex')
        buf.set(txidBytes, offset)
        offset += txidBytes.byteLength
      }
    }
  }

  buf.writeUInt8(0xff, offset)
  offset++

  encode.bytes = offset - startIndex
  return buf
}

function decode (buf, offset) {
  if (!offset) offset = 0
  const startIndex = offset

  const seals = []
  let typeCounter = 0

  while (true) {
    const seal = {}

    const fvout = fvi.decode(buf, offset)
    offset += fvi.decode.bytes

    if (fvout.value === 0x7f) {
      if (fvout.flag) break
      typeCounter++
      continue
    }

    seal.vout = fvout.value
    seal.type = typeCounter

    if (fvout.flag) {
      seal.txid = buf.subarray(offset, offset + 32).toString('hex')
      offset += 32
    }

    seals.push(seal)
  }

  decode.bytes = offset - startIndex
  return seals
}

function encodingLength (seals) {
  let length = 0
  let sealType

  if (seals.length) {
    for (let seal of seals) {
      if (!sealType) sealType = seal.type
      if (seal.type !== sealType) {
        length++
      }

      const outpoint = seal.outpoint.split(':')

      const fvout = {}
      fvout.value = outpoint[1]
      fvout.flag = !(!seal.outpoint)

      length += fvi.encodingLength(fvout)

      if (seal.outpoint) length += 32
    }
  }

  return length + 1
}

test = []

for (let i = 0; i < 10; i++) {
  const seal = {}
  seal.type = Math.floor(i / 3)
  seal.vout = i
  if (i % 3 === 0) seal.txid = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  test.push(seal)
}

const schema = {
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
    { title: 'signature', type: 'ecdsa'},
    { title: 'original_pubkey', type: 'pubkey'}
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

// let encoded = encode(test)
// console.log(encoded)
// console.log(decode(encoded, null, schema))
