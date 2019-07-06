var string = require('../bitcoin-consensus-encoding/string.js')
var int = require('../bitcoin-consensus-encoding//int.js')
var bool = require('../bitcoin-consensus-encoding//boolean.js')
var contract = require('./example.json')

module.exports = {
  encode,
  decode,
  encodingLength
}

function encode (contract, buf, offset) {
  if (!buf) buf = Buffer.alloc(encodingLength(contract))
  if (!offset) offset = 0
  var startIndex = offset

  string.encode(contract.title, buf, offset)
  offset += string.encode.bytes
  // console.log(offset, 'title')

  int.encode(contract.version, buf, offset, 16)
  offset += int.encode.bytes
  // console.log(offset, 'version')

  if (contract.description) {
    string.encode(contract.description, buf, offset)
  } else {
    string.encode('', buf, offset)
  }
  offset += string.encode.bytes
  // console.log(offset, 'description')

  if (contract.contract_url) {
    string.encode(contract.contract_url, buf, offset)
  } else {
    string.encode('', buf, offset)
  }
  offset += string.encode.bytes
  // console.log(offset, 'url')

  string.encode(contract.issuance_utxo, buf, offset, true)
  offset += string.encode.bytes
  // console.log(offset, 'iss utxo')

  string.encode(contract.network, buf, offset, true)
  offset += string.encode.bytes
  // console.log(offset, 'network')

  int.encode(BigInt(contract.total_supply), buf, offset, 64)
  offset += int.encode.bytes
  // console.log(offset, 'supply')

  int.encode(BigInt(contract.min_amount), buf, offset, 64)
  offset += int.encode.bytes
  // console.log(offset, 'min_amount')

  // optional field encode big-endian, usually starts with 0x00 -> how to indicate optional field?
  if (contract.max_hops || contract.max_hops === 0) {
    int.encode(contract.max_hops, buf, offset, 32)
    offset += int.encode.bytes
  } else {
    buf.writeUInt8(0, offset)
    offset++
  }
  // console.log(offset, 'max_hops')

  bool.encode(contract.reissuance_enabled, buf, offset)
  offset += bool.encode.bytes
  // console.log(offset, 'reissuance_enabled')

  if (contract.reissuance_enabled) {
    string.encode(contract.reissuance_utxo, buf, offset, true)
  } else {
    string.encode('', buf, offset)
  }
  offset += string.encode.bytes
  // console.log(offset, 'reissuance_utxo')

  if (contract.burn_address) {
    string.encode(contract.burn_address, buf, offset, true)
  } else {
    string.encode('', buf, offset)
  }
  offset += string.encode.bytes
  // console.log(offset, 'burn_address')

  string.encode(contract.commitment_scheme, buf, offset, true)
  offset += string.encode.bytes
  // console.log(offset, 'commitment_scheme')

  int.encode(contract.blueprint_type, buf, offset, 8)
  offset += int.encode.bytes
  // console.log(offset, 'blueprint_type')

  encode.bytes = offset - startIndex
  return buf
}

function decode (buf, offset) {
  if (!offset) offset = 0
  var startIndex = offset
  var contract = {}
  // console.log(offset)

  contract.title = string.decode(buf, offset)
  offset += string.decode.bytes
  // console.log(offset, 'title')

  contract.version = int.decode(buf, offset, 2)
  offset += int.decode.bytes
  // console.log(offset, 'version')

  contract.description = string.decode(buf, offset)
  offset += string.decode.bytes
  // console.log(offset, 'description')

  contract.contract_url = string.decode(buf, offset)
  offset += string.decode.bytes
  // console.log(offset, 'contract_url')

  contract.issuance_utxo = string.decode(buf, offset, 3)
  offset += string.decode.bytes

  contract.network = string.decode(buf, offset, 3)
  offset += string.decode.bytes
  // console.log(offset, 'network', buf.subarray(offset - 3, offset))

  contract.total_supply = Number(int.decode(buf, offset, 8))
  offset += int.decode.bytes
  // console.log(offset, 'total_supply')

  contract.min_amount = Number(int.decode(buf, offset, 8))
  offset += int.decode.bytes
  // console.log(offset, 'min_amount')

  // this is an optional field...
  contract.max_hops = int.decode(buf, offset, 4)
  offset += int.decode.bytes
  // console.log(contract.max_hops)

  contract.reissuance_enabled = bool.decode(buf, offset)
  offset += bool.decode.bytes

  if (contract.reissuance_enabled) {
    contract.reissuance_utxo = string.decode(buf, offset, 32)
    offset += string.decode.bytes
  } else {
    offset++
  }

  if (string.decode(buf, offset) !== '') {
    contract.burn_address = string.decode(buf, offset, 32)
    offset += string.decode.bytes
  } else {
    offset++
  }

  contract.commitment_scheme = string.decode(buf, offset, 1)
  offset += string.decode.bytes

  contract.blueprint_type = int.decode(buf, offset, 1)
  offset += string.decode.bytes

  decode.bytes = offset - startIndex
  return contract
}

function encodingLength (contract) {
  var length = 0
  length += string.encodingLength(contract.title)
  // console.log(length, 'title')
  length += 2
  // console.log(length, 'version')
  if (contract.description) {
    length += string.encodingLength(contract.description)
  } else {
    length++
  }
  // console.log(length, 'description')
  if (contract.contract_url) {
    length += string.encodingLength(contract.contract_url)
  } else {
    length++
  }
  // console.log(length, 'url')
  length += string.encodingLength(contract.issuance_utxo, true)
  // console.log(length, 'issuance_utxo', Buffer.from(contract.issuance_utxo, 'hex'))
  length += string.encodingLength(contract.network, true)
  // console.log(length, 'network')
  length += 8
  // console.log(length, 'supply')
  length += 8
  // console.log(length, 'min_amount')
  if (contract.max_hops) {
    length += 4
  } else {
    length++
  }
  // console.log(length, 'max_hops')
  length += bool.encodingLength()
  // console.log(length, 'reissuance_enabled')
  if (contract.reissuance_utxo) {
    length += string.encodingLength(contract.reissuance_utxo, true)
  } else {
    length++
  }
  // console.log(length, 'reissuance_utxo')
  if (contract.burn_address) {
    length += string.encodingLength(contract.burn_address, true)
  } else {
    length++
  }
  // console.log(length, 'burn_address')
  length += string.encodingLength(contract.commitment_scheme, true)
  // console.log(length, 'commitment_scheme')
  length += 1
  // console.log(length, 'blueprint_type')

  return length
}

// console.log(decode(encode(contract)))
// var exampleScript = fs.readFileSync('./example.contract')