var issuanceUTXO = {
  'txid': 'def1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
  'vout': 11
}

module.exports = {
  proofGen
}

var contract = {
  'title': 'string',
  'version': 234,
  'description': 'string',
  'contract_url': 'string',
  'issuance_utxo': issuanceUTXO,
  'network': '43fe44',
  'total_supply': 0,
  'min_amount': 0,
  'max_hops': 1,
  'reissuance_enabled': true,
  'reissuance_utxo': '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  'burn_address': 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  'commitment_scheme': 2,
  'blueprint_type': 1,
  'owner_utxo': '49cafdbc3e9133a75b411a3a6d705dca2e9565b660123b6535babb7567c28f02'
}

var outpoint = {
  type: 'UTXO',
  address: '49cafdbc3e9133a75b411a3a6d705dca2e9565b660123b6535babb7567c28f02'
}

var counter = 1

// function to generate a simple branched proof
// depth is how many steps away from the root proof
// branch determines how many inputs each proof has
function proofGen (depth, branch) {
  var proof = {}
  proof.inputs = []
  if (depth === 1) {
    counter++
    proof.contract = contract
    proof.contract.max_hops = counter
  } else {
    counter++
    for (let j = branch; j > 0; j--) {
      proof.inputs.push(proofGen(depth - 1, branch))
    }
  }

  proof.outputs = [{
    assetId: '4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123',
    amount: 400,
    outpoint: outpoint
  }]
  proof.metadata = '0149cafdbc3e9133a75b411a3a6d705dca2e9565b660123b6535babb7567c28f02'
  proof.tx = {
    id: '4567890abcdef1234567890abcdef123',
    outputs: [1, 23, 4, 5, 223, 58745, 33, 12]
  }
  proof.originalPK = '4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123'
  return proof
}
