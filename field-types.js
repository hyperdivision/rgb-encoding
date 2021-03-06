const fs = require('fs')

const Fieldencodings = {
  'u8': {
    encoding: 'int',
    decodeOpts: [1]
  },
  'u16': {
    encoding: 'int',
    decodeOpts: [2]
  },
  'u32': {
    encoding: 'int',
    decodeOpts: [4]
  },
  'u64': {
    encoding: 'int',
    decodeOpts: [8]
  },
  'i8': {
    encoding: 'int',
    decodeOpts: [1, false]
  },
  'i16': {
    encoding: 'int',
    decodeOpts: [2, false]
  },
  'i32': {
    encoding: 'int',
    decodeOpts: [4, false]
  },
  'i64': {
    encoding: 'int',
    decodeOpts: [8, false]
  },
  'vi': {
    encoding: 'varint',
    decodeOpts: []
  },
  'fvi': {
    encoding: 'fvi',
    decoed: []
  },
  'str': {
    encoding: 'string',
    decodeOpts: []
  },
  'bytes': {
    encoding: 'bytes',
    decodeOpts: []
  },
  'sha256': {
    encoding: 'hash',
    decodeOpts: [32]
  },
  'sha256d': {
    encoding: 'hash',
    decodeOpts: [32]
  },
  'ripmd160': {
    encoding: 'hash',
    decodeOpts: [20]
  },
  'hash160': {
    encoding: 'hash',
    decodeOpts: [20]
  },
  'outpoint': {
    encoding: 'outpoint',
    decodeOpts: []
  },
  'soutpoint': {
    encoding: 'soutpoint',
    decodeOpts: []
  },
  'pubkey': {
    encoding: 'pubkey',
    decodeOpts: []
  },
  'ecdsa': {
    encoding: 'ecdsa',
    decodeOpts: []
  }
}

fs.writeFile('./field-types.json', JSON.stringify(Fieldencodings, null, 2), (err) => {
  if (err) throw err
})
