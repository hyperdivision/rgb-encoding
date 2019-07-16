const header = require('./header.js')
const body = require('./body.js')

module.exports = {
  encode: encode,
  decode: decode,
  encodingLength: encodingLength
}

// TODO: 'weak' proof reference? https://github.com/rgb-org/rgb-rust/blob/c01c6e878646d66541a24e35c39631ef4cbc3bcb/src/contract.rs#L137
// TODO: same doc as ^ - original public key
function encode (contract, buf, offset) {
  if (!offset) offset = 0
  if (!buf) buf = Buffer.alloc(encodingLength(contract))
  var startIndex = offset
  header.encode(contract, buf, offset)
  offset += header.encode.bytes

  body.encode(contract, buf, offset)
  offset += body.encode.bytes

  encode.bytes = offset - startIndex
  return buf
}

function decode (buf, offset) {
  if (!offset) offset = 0
  var startIndex = offset

  var contract = header.decode(buf, offset)
  offset += header.decode.bytes

  var contractBody = body.decode(buf, offset, contract.blueprint_type)
  offset += body.decode.bytes

  Object.keys(contractBody).forEach(
    function (key) { contract[key] = contractBody[key] }
  )

  decode.bytes = offset - startIndex
  return contract
}

function encodingLength (contract) {
  var length = 0

  length += header.encodingLength(contract)
  length += body.encodingLength(contract)
  return length
}
