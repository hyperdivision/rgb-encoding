var string = require('../bitcoin-consensus-encoding/string.js')
var int = require('../bitcoin-consensus-encoding/int.js')
var varint = require('../bitcoin-consensus-encoding/var-int.js')
var btcScript = require('../bitcoin-consensus-encoding/script.js')
var output = require('./rgb-output.js')
var contract = require('./contract.js')
var assert = require('nanoassert')
var sodium = require('sodium-native')
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

  encoder(proof, buf, offset, encodingLength.depth)
  encode.bytes = offset - oldOffset
  return buf
}

function decode (buf, offset) {
  if (!offset) offset = 0
  var oldOffset = offset

  var proof = decoder(buf, offset)

  decode.bytes = offset - oldOffset
  return proof
}

function encodingLength (proof, depth) {
  var length = 0
  if (!depth) depth = 0
  if (!proof.inputs.length) {
    length++
    encodingLength.depth = depth
  } else {
    length += varint.encodingLength(proof.inputs.length)
    depth++
    for (let input of proof.inputs) {
      length += encodingLength(input, depth)
    }
  }
  var outputsLength = proof.outputs.length
  length += varint.encodingLength(outputsLength)

  for (let entry of proof.outputs) {
    length += output.encodingLength(entry)
  }

  length += string.encodingLength(proof.metadata)
  length += string.encodingLength(proof.tx.id, true)
  var txOutLength = proof.tx.outputs.length
  length += varint.encodingLength(txOutLength)

  length += 4 * proof.tx.outputs.length

  if (proof.contract) {
    length += contract.encodingLength(proof.contract)
  } else {
    length++
  }

  if (proof.originalPK) {
    length += 64
  } else {
    length++
  }

  encodingLength.depth = encodingLength.depth
  return length
}

// ISSUE: want to loop over array of inputs, but first time encoder is called, inputs is not an array

function encoder (proof, buf, offset, depth) {
  // console.log(proof, depth)
  var oldOffset = offset

  // depth is 1, we arrive at root proof, which has inputs = []
  if (depth === 0) {
    buf.writeUInt8(0, offset)
    offset++
    // console.log(offset, 'root')
  } else {
    varint.encode(proof.inputs.length, buf, offset)
    offset += varint.encode.bytes

    depth--

    for (let input of proof.inputs) {
      encoder(input, buf, offset, depth)
      offset += encoder.bytes
    }
  }

  var outputsLength = proof.outputs.length
  varint.encode(outputsLength, buf, offset)
  offset += varint.encode.bytes

  for (let entry of proof.outputs) {
    output.encode(entry, buf, offset)
    offset += output.encode.bytes
  }

  string.encode(proof.metadata, buf, offset)
  offset += string.encode.bytes

  string.encode(proof.tx.id, buf, offset, true)
  offset += string.encode.bytes

  var txOutLength = proof.tx.outputs.length
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
  } else {
    string.encode('', buf, offset)
  }
  offset += string.encode.bytes

  encoder.bytes = offset - oldOffset
  return buf
}

function decoder (buf, offset, depth = 0) {
  depth++
  var proof = {}
  var oldOffset = offset
  let inputLength = varint.decode(buf, offset)
  proof.inputs = []
  offset += varint.decode.bytes

  if (inputLength) {
    var counter = inputLength

    while (counter > 0) {
      proof.inputs.push(decoder(buf, offset, depth))
      offset += decoder.bytes
      counter--
    }
  }

  proof.outputs = []
  counter = varint.decode(buf, offset)
  offset += varint.decode.bytes

  while (counter > 0) {
    proof.outputs.push(output.decode(buf, offset))
    offset += output.decode.bytes
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

  indicator = string.decode(buf, offset)

  if (indicator !== '') {
    proof.originalPK = string.decode(buf, offset, 64)
    offset += string.decode.bytes
  } else {
    offset++
  }

  decoder.bytes = offset - oldOffset

  return proof
}

// var exampleProof = fs.readFileSync('./example.proof').toString()
// exampleProof = JSON.parse(exampleProof)
// console.log(getInputAmounts(exampleProof, '49cafdbc3e9133a75b411a3a6d705dca2e9565b660123b6535babb7567c28f02'))
// console.log(getOutputAmounts(exampleProof))

// var encoded = encode(exampleProof)
// console.log(encoded.byteLength / 2**20)
// var decoded = decode(encoded)

// var decoded = decode(encode(exampleProof))

// fs.writeFile('test.decode', JSON.stringify(decoded, null, 2), (err) => { if (err) throw err })
