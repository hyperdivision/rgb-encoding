var string = require('../bitcoin-consensus-encoding/string.js')
var int = require('../bitcoin-consensus-encoding/int.js')
var bool = require('../bitcoin-consensus-encoding/boolean.js')
var btcOutpoint = require('../bitcoin-consensus-encoding/outpoint.js')
var outpoint = require('./outpoint.js')
var assert = require('nanoassert')

module.exports = {
  encode,
  decode,
  encodingLength
}

function encode (contract, buf, offset) {
  if (!buf) buf = Buffer.alloc(151)
  if (!offset) offset = 0
  var startIndex = offset

  string.encode(contract.title, buf, offset)
  offset += string.encode.bytes

  int.encode(contract.version, buf, offset, 16)
  offset += int.encode.bytes

  if (contract.description) {
    string.encode(contract.description, buf, offset)
  } else {
    string.encode('', buf, offset)
  }
  offset += string.encode.bytes

  if (contract.contract_url) {
    string.encode(contract.contract_url, buf, offset)
  } else {
    string.encode('', buf, offset)
  }
  offset += string.encode.bytes
  
  btcOutpoint.encode(contract.issuance_utxo, buf, offset, true)
  offset += btcOutpoint.encode.bytes
  
  string.encode(contract.network, buf, offset, true)
  offset += string.encode.bytes
  
  int.encode(BigInt(contract.total_supply), buf, offset, 64)
  offset += int.encode.bytes
  
  int.encode(BigInt(contract.min_amount), buf, offset, 64)
  offset += int.encode.bytes
  
  if (contract.max_hops || contract.max_hops === 0) {
    buf.writeUInt8(1, offset)
    offset++
    int.encode(contract.max_hops, buf, offset, 32)
    offset += int.encode.bytes
  } else {
    buf.writeUInt8(0, offset)
    offset++
  }

  bool.encode(contract.reissuance_enabled, buf, offset)
  offset += bool.encode.bytes

  if (contract.reissuance_enabled) {
    string.encode(contract.reissuance_utxo, buf, offset, true)
  } else {
    string.encode('', buf, offset)
  }
  offset += string.encode.bytes

  if (contract.burn_address) {
    string.encode(contract.burn_address, buf, offset, true)
  } else {
    string.encode('', buf, offset)
  }
  offset += string.encode.bytes

  int.encode(contract.commitment_scheme, buf, offset, 8)
  offset += int.encode.bytes

  int.encode(contract.blueprint_type, buf, offset, 16)
  offset += int.encode.bytes

  encode.bytes = offset - startIndex
  return buf
}

function decode (buf, offset) {
  if (!offset) offset = 0
  var startIndex = offset
  var contract = {}

  contract.title = string.decode(buf, offset)
  offset += string.decode.bytes

  contract.version = int.decode(buf, offset, 2)
  offset += int.decode.bytes

  contract.description = string.decode(buf, offset)
  offset += string.decode.bytes

  contract.contract_url = string.decode(buf, offset)
  offset += string.decode.bytes

  contract.issuance_utxo = btcOutpoint.decode(buf, offset)
  offset += btcOutpoint.decode.bytes

  contract.network = string.decode(buf, offset, 3)
  offset += string.decode.bytes

  // int encode should return a number if n < 2^53
  contract.total_supply = Number(int.decode(buf, offset, 8))
  offset += int.decode.bytes

  contract.min_amount = Number(int.decode(buf, offset, 8))
  offset += int.decode.bytes

  var maxHopsFlag = buf.readUInt8(offset)
  offset++
  if (maxHopsFlag) {
    contract.max_hops = int.decode(buf, offset, 4)
    offset += int.decode.bytes
  }

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
  }
  offset += string.decode.bytes

  contract.commitment_scheme = int.decode(buf, offset, 1)
  offset += int.decode.bytes

  contract.blueprint_type = int.decode(buf, offset, 2)
  offset += int.decode.bytes

  decode.bytes = offset - startIndex
  return contract
}

function encodingLength (contract) {
  var length = 0  
  length += string.encodingLength(contract.title)
  length += 2
  if (contract.description) {
    length += string.encodingLength(contract.description)
  } else {
    length++
  }
  if (contract.contract_url) {
    length += string.encodingLength(contract.contract_url)
  } else {
    length++
  }

  length += btcOutpoint.encodingLength(contract.issuance_utxo)
  length += string.encodingLength(contract.network, true)
  length += 8
  length += 8
  if (contract.max_hops) {
    length += 4
  }
  length++
  length += bool.encodingLength()
  if (contract.reissuance_utxo) {
    length += string.encodingLength(contract.reissuance_utxo, true)
  } else {
    length++
  }
  if (contract.burn_address) {
    length += string.encodingLength(contract.burn_address, true)
  } else {
    length++
  }
  length += 1
  length += 2
  
  return length
}
