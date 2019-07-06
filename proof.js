var string = require('../bitcoin-consensus-encoding/string.js')
var int = require('../bitcoin-consensus-encoding/int.js')
var varint = require('../bitcoin-consensus-encoding/var-int.js')
var outpoint = require('./outpoint.js')
var contract = require('./contract.js')
var fs = require('fs')

module.exports = {
  encode,
  decode,
  encodingLength
}

function encode (proof, buf, offset) {
  if (!buf) buf = Buffer.alloc(encodingLength(proof))
  if (!offset) offset = 0

  var oldOffset = offset

  varint.encode(encodingLength.depth, buf, offset)
  offset += varint.encode.bytes

  encoder(proof, buf, offset, encodingLength.depth)

  encode.bytes = offset - oldOffset
  return buf
}

function decode (buf, offset) {
  if (!offset) offset = 0
  var oldOffset = offset

  var proofLength = varint.decode(buf, offset)
  offset += varint.decode.bytes
  var proof = decoder(buf, offset, proofLength)

  decode.bytes = offset - oldOffset
  return proof
}

function encodingLength (proof, depth) {
  var length = 0
  if (!depth) depth = 0

  if (!proof.inputs) {
    length++
    encodingLength.depth = depth
  } else {
    depth++
    length += encodingLength(proof.inputs, depth)

    var outpointsLength = Object.keys(proof.outpoints).length
    length += varint.encodingLength(outpointsLength)

    for (let output of proof.outpoints) {
      length += outpoint.encodingLength(output)
    }

    length += string.encodingLength(proof.metadata)

    length += string.encodingLength(proof.tx.id)
    var txOutLength = Object.keys(proof.tx.outputs).length
    length += varint.encodingLength(txOutLength)

    length += 4 * proof.tx.outputs.length

    if (proof.contract) {
      length += contract.encodingLength(proof.contract)
      // console.log(proof.contract, contract.encodingLength(proof.contract))
    } else {
      length++
    }

    if (proof.originalPK) {
      length += 64
    } else {
      length++
    }
  }

  length += varint.encodingLength(length)

  depth = encodingLength.depth
  encodingLength.depth = depth
  return length
}

function encoder (proof, buf, offset, i) {
  var oldOffset = offset
  if (i === 1) {
    buf.writeUInt8(0, offset)
    offset++
  } else {
  // NEW CODE
    i--
    encoder(proof.inputs, buf, offset, i)
    offset += encoder.bytes
  }
  // BREAKER
  var outpointsLength = Object.keys(proof.outpoints).length
  varint.encode(outpointsLength, buf, offset)
  offset += varint.encode.bytes

  for (let output of proof.outpoints) {
    outpoint.encode(output, buf, offset)
    offset += outpoint.encode.bytes
  }

  string.encode(proof.metadata, buf, offset)
  offset += string.encode.bytes

  string.encode(proof.tx.id, buf, offset, true)
  offset += string.encode.bytes

  var txOutLength = Object.keys(proof.tx.outputs).length
  varint.encode(txOutLength, buf, offset)
  offset += varint.encode.bytes

  for (let output of proof.tx.outputs) {
    int.encode(output, buf, offset, 32)
    offset += int.encode.bytes
  }

  if (proof.contract) {
    contract.encode(proof.contract, buf, offset)
    offset += contract.encode.bytes
  } else {
    buf.writeUInt8(0, offset)
    offset++
  }

  if (proof.originalPK) {
    string.encode(proof.originalPK, buf, offset, true)
    offset += string.encode.bytes
  } else {
    buf.writeUInt8(0, offset)
    offset++
  }

  encoder.bytes = offset - oldOffset
  return buf
}

function decoder (buf, offset, i) {
  var proof = {}
  var oldOffset = offset

  if (i === 1) {
    proof.inputs = []
    offset++
  } else {
    i--
    proof.inputs = decoder(buf, offset, i)
    offset += decoder.bytes
  }
  proof.outpoints = []
  let counter = varint.decode(buf, offset)
  offset += varint.decode.bytes

  while (counter > 0) {
    proof.outpoints.push(outpoint.decode(buf, offset))
    offset += outpoint.decode.bytes
    counter--
  }

  proof.metadata = string.decode(buf, offset)
  offset += string.decode.bytes

  proof.tx = {}
  proof.tx.id = string.decode(buf, offset, 16)
  offset += string.decode.bytes

  proof.tx.outputs = []

  counter = varint.decode(buf, offset)
  offset += varint.decode.bytes

  while (counter > 0) {
    proof.tx.outputs.push(buf.readUInt32BE(offset))
    offset += 4
    counter--
  }

  var indicator = buf.readUInt8(offset)
  if (indicator !== 0) {
    proof.contract = contract.decode(buf, offset)
    offset += contract.decode.bytes
  } else {
    offset++
  }

  indicator = buf.readUInt8(offset)


  if (indicator !== 0) {
    proof.originalPK = string.decode(buf, offset, 64)
    offset += 64
  } else {
    offset++
  }

  decoder.bytes = offset - oldOffset

  return proof
}

var exampleProof = fs.readFileSync('./example.proof').toString()
exampleProof = JSON.parse(exampleProof)
var decoded = decode(encode(exampleProof))

fs.writeFile('test.decode', JSON.stringify(decoded, null, 2), (err) => { if (err) throw err })
