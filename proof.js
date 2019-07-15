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

function getContract (proof, contracts) {
  if (!contracts) contracts = {}
  if (proof.contract) {
    assert(!proof.inputs.length, 'root proof can have no inputs.')
    var serializedContract = contract.encode(proof.contract)
    var contractId = getIdentityHash(serializedContract)
    // find contract assigned to assetId
    if (!contracts.hasOwnproperty(contractId)) {
      contracts[contractId] = (proof.contract)
    } else {
      throw new Error('only one contract per asset.')
    }
  } else {
    for (let input of proof.inputs) {
      // check whether upstream proofs move asset
      // use recursively to find root proof.
      getContract(input, contracts)
    }
  }
  // TODO: handle reissuance case.
  return contracts
}

function getIdentityHash (item) {
  var identityHash = Buffer.alloc(sodium.crypto_hash_sha256_BYTES)
  sodium.crypto_hash_sha256(identityHash, item)
  sodium.crypto_hash_sha256(identityHash, identityHash)
  return identityHash
}

function verify (proof) {
  // 1. Check proof integrity
  if (proof.inputs.length === 0) {
    assert(proof.contract, 'non-root proofs must have upstream proofs')
    assert(contract.verify(proof.contract), 'contract is not valid.')
  } else {
  // 2. Contract must pass verification
    assert(!proof.contract,
      'only root proofs should have associated contracts.')
  }

  // 3. Validate proof has correct structure for the given contract type
  // (i.e. metadata present/not present, original public key given for
  // pay-to-contract commitment schemes etc.)
  // This has to be done for each asset.
  for (let asset of proof.outputs) {
    var root = getContract(proof, asset.assetId)
    assert(contract.validate(root, proof), 'invalid contract provided')
  }

  // 4. Reiterate for all upstream proofs
  for (let input of proof.inputs) {
    verify(input)
  }

  // 5. Verify associated commitments in bitcoin transactions
  // 5.1. Check that commitment transaction has all the necessary outputs referenced
  // by the proof
  let commitmentTx = txProvider(TxQuery)
  assert(proof.tx.outputs.length < commitmentTx.output.length,
    'missing transaction output specified in proof.')
  let rootScripts = allScripts(proof)

  // 5.2. Check that each output referenced by the proof is colored with proper script
  for (let output of commitmentTx.output) {
    if (!Object.values(rootScripts).contains(output.script_pub_key)) {
      throw new Error('cannot verify output script commitments')
    }
  }

  // TODO write proper function for reading btc Pk compressed or not.`

  // 6. Matching input and output balances
  // 6.1. There should be the same number of assets in both inputs and outputs

  // TODO: function to get address of the tx this proof refers to
  var inBalances = getInputAmounts(proof, address)
  var outBalances = getOutputAmounts(proof)

  assert(Object.keys(inBalances).length === Object.keys(outBalances).length,
    'number of assets must balance between inputs and outputs')

  // 6.2. Comparing input and output amounts per each asset
  for (let key of Object.keys(inBalances)) {
    assert(outBalances.hasOwnProperty(key), 'all assets in must have an output')
    assert(inBalances[key] === outBalances[key], 'input and output amounts do not balance')
  }
  // 7. Check commitment transactions for each of the proof inputs
  // 7.1. For non-root proofs there MUST be inputs for the transaction

  // We alreaady checked this in step 1

  // 7.2. Check commitment transactions for each of the proof inputs
  // Get rgb input txs -> get object tx (one being spent) -> iterate through object's
  // on chain inputs and match to rgb inputs -> verify each rgb input is on chain correctly
  for (let input of proof.inputs) {
    let inputTx = txProvider(TxQuery)
    let txInputs = commitmentTx.inputs.filter(txInput =>
      txInput.previous_output.txid === inputTx.txid)

    // we now have txInputs, a list of the on-chain input transactions, we need to check that
    // for each of the outputs of the input proof, the output points to one AND ONLY
    // one of the transactions in txInputs
    for (let output of input.outputs) {
      switch (output.outpoint) {
        case 'UTXO' :

          break

        case 'vout' :
          let txIns = txInputs.slice()
          let correctTxIns = txIns.filter(txInput =>
            txInput.previous_output.vout === output.vout)
          assert(correctTxIns.length === 1, 'rgb input cannot be found on chain')
          break
      }
    }
  }
}

function getScript (proof, assetId) {
  let commitmentScheme = getContract(proof)[assetId].commitmentScheme
  let script = String()
  let contractHash = getIdentityHash(proof)

  switch (commitmentScheme) {
    // OP_RETURN
    case 0x01 :
      script += 'OP_RETURN '
      script += contractHash.toString('hex')
      break

    // pay-to-contract
    case 0x02 :
      script += 'OP_DUP '
      script += 'OP_HASH160 '
      let originalKey = proof.originalPK
      let tweakedKey = tweakKey(originalKey, contractHash)
      // should be base58 encoded
      script += tweakedKey.toString('hex') + ' '
      script += 'OP_EQUALVERIFY '
      script += 'OP_CHECKSIG'
      break
  }
  return script
}

function allScripts (proof) {
  let scripts = getInputAmounts(proof)
  for (let key of Object.keys(scripts)) {
    scripts[key] = getScript(proof, key)
  }
  return scripts
}

function tweakKey (publicKey, tweak) {
  if (!Buffer.isBuffer(publicKey)) publicKey = Buffer.from(publicKey, 'base58') // need to get bitcoin key encoding
  if (!Buffer.isBuffer(tweak)) tweak = Buffer.from(tweak)
  const source = [
    publicKey,
    Buffer.from("RGB"),
    tweak
  ]
  var input = Buffer.concat(source)
  var tweakedKey = getIdentityhash(item)

function getInputAmounts (proof, address) {
  // if (!Buffer.isBuffer(assetid)) assetId = Buffer.from(assetid, 'hex')
  var assetAmounts = {}
  if (proof.contract) {
    var assetId = getIdentityHash(proof.contract)
    assert(!proof.inputs.lengths, 'root proofs cannot have upstream proofs')
    assert(!assetAmounts.hasOwnProperty(assetId), 'asset cannot have multiple roots')
    assetAmounts[assetId] = contract.total_supply
    return assetAmounts
  } else {
    for (let input of proof.inputs) {
      assetAmounts = getOutputAmounts(input, assetAmounts, address)
    }
  }
  return assetAmounts
}

function getOutputAmounts (proof, assetAmounts, address) {
  if (!assetAmounts) assetAmounts = {}
  for (let output of proof.outputs) {
    if (!address || output.outpoint.address === address) {
      if (assetAmounts.hasOwnProperty(output.assetId)) {
        assetAmounts[output.assetId] += output.amount
      } else {
        assetAmounts[output.assetId] = output.amount
      }
    }
  }
  return assetAmounts
}

var exampleProof = fs.readFileSync('./example.proof').toString()
exampleProof = JSON.parse(exampleProof)
console.log(getInputAmounts(exampleProof, '49cafdbc3e9133a75b411a3a6d705dca2e9565b660123b6535babb7567c28f02'))
console.log(getOutputAmounts(exampleProof))
// var encoded = encode(exampleProof)
// console.log(encoded.byteLength / 2**20)
// var decoded = decode(encoded)

// var decoded = decode(encode(exampleProof))

// fs.writeFile('test.decode', JSON.stringify(decoded, null, 2), (err) => { if (err) throw err })
