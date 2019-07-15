var outpoint = require('./outpoint.js')
var string = require('../bitcoin-consensus-encoding/string.js')
var int = require('../bitcoin-consensus-encoding/int.js')

module.exports = {
  encode,
  decode,
  encodingLength
}

function encode (output, buf, offset) {
  if (!buf) buf = Buffer.alloc(encodingLength(output))
  if (!offset) offset = 0
  var start = offset

  string.encode(output.assetId, buf, offset, true)
  offset += string.encode.bytes

  int.encode(output.amount, buf, offset, 64)
  offset += int.encode.bytes

  outpoint.encode(output.outpoint, buf, offset)
  offset += outpoint.encode.bytes

  encode.bytes = offset - start
  return buf
}

function decode (buf, offset) {
  var output = {}
  var start = offset

  output.assetId = string.decode(buf, offset, 32)
  offset += string.decode.bytes

  output.amount = Number(int.decode(buf, offset, 8))
  offset += int.decode.bytes

  output.outpoint = outpoint.decode(buf, offset)
  offset += outpoint.decode.bytes

  decode.bytes = offset - start
  return output
}

function encodingLength (output) {
  var length = 0

  length += string.encodingLength(output.assetId, true)
  length += 8
  length += outpoint.encodingLength(output.outpoint)

  return length
}
