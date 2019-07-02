var string = require('./string.js')
var int = require('./int.js')
var bool = require('./boolean.js')
var contract = require('./example.json')

function encode (contract, buf, offset) {
  if (!buf) buf = Buffer.alloc(encodingLength(contract))
  if (!offset) offset = 0
  var startIndex = offset

  string.encode(contract.title, buf, offset)
  offset += string.encode.bytes

  int.encode(contract.version, buf, offset, 16)
  offset += int.encode.bytes

  if (contract.description) {
    string.encode(contract.description, buf, offset)
    offset += string.encode.bytes
  } else {
    string.encode('', buf, offset)
    offset++
  }

  if (contract.contract_url) {
    string.encode(contract.contract_url, buf, offset)
    offset += string.encode.bytes
  } else {
    string.encode('', buf, offset)
    offset++
  }

  string.encode(contract.issuance_utxo, buf, offset, true)
  offset += string.encode.bytes

  string.encode(contract.network, buf, offset, true)
  offset += string.encode.bytes

  int.encode(BigInt(contract.total_supply), buf, offset, 64)
  offset += int.encode.bytes

  int.encode(BigInt(contract.min_amount), buf, offset, 64)
  offset += int.encode.bytes

  if (contract.max_hops || contract.max_hops === 0) {
    int.encode(contract.max_hops, buf, offset, 32)
    offset += int.encode.bytes
  } else {
    buf.writeUInt8(0, offset)
    offset++
  }

  bool.encode(contract.reissuance_enabled, buf, offset)
  offset += bool.encode.bytes

  if (contract.reissuance_utxo) {
    string.encode(contract.reissuance_utxo, buf, offset)
    offset += string.encode.bytes
  } else {
    string.encode('', buf, offset)
    offset++
  }

  if (contract.burn_address) {
    string.encode(contract.burn_address, buf, offset)
    offset += string.encode.bytes
  } else {
    string.encode('', buf, offset)
    offset++
  }

  string.encode(contract.commitment_scheme, buf, offset, true)
  offset += string.encode.bytes

  string.encode(contract.blueprint_type, buf, offset, true)
  offset += string.encode.bytes

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

  contract.total_supply = int.decode(buf, offset, 8)
  offset += int.decode.bytes
  // console.log(offset, 'total_supply')

  contract.min_amount = int.decode(buf, offset, 8)
  offset += int.decode.bytes
  // console.log(offset, 'min_amount')

  contract.max_hops = int.decode(buf, offset, 4)
  offset += int.decode.bytes

  contract.reissuance_enabled = bool.decode(buf, offset)
  offset += bool.decode.bytes

  contract.reissuance_utxo = string.decode(buf, offset)
  offset += string.decode.bytes

  contract.burn_address = string.decode(buf, offset)
  offset += string.decode.bytes

  contract.commitment_scheme = string.decode(buf, offset, 1)
  offset += string.decode.bytes

  contract.blueprint_type = string.decode(buf, offset, 1)
  offset += string.decode.bytes

  decode.bytes = offset - startIndex
  return contract
}

function encodingLength (contract) {
  var length = 0
  length += string.encodingLength(contract.title)
  length += int.encodingLength(16)
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
  const issuanceUTXObytes = Buffer.from(contract.issuance_utxo)
  length += issuanceUTXObytes.byteLength
  const networkBytes = Buffer.from(contract.network)
  length += networkBytes.byteLength
  length += int.encodingLength(64)
  length += int.encodingLength(64)
  if (contract.max_hops) {
    length += int.encodingLength(32)
  } else {
    length++
  }
  length += bool.encodingLength()
  if (contract.reissuance_utxo) {
    length += string.encodingLength(contract.reissuance_utxo)
  } else {
    length++
  }
  if (contract.burn_address) {
    length += string.encodingLength(contract.burn_address)
  } else {
    length++
  }
  length += string.encodingLength(contract.commitment_scheme)
  length += 1

  return length
}

// var exampleScript = fs.readFileSync('./example.contract')
var encoded = encode(contract)
console.log(encoded.toString('hex'))
var decoded = decode(encoded)
console.log(decoded)
