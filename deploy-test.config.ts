import {ethers} from "hardhat";

export let deployConfig = {
    NftName: "Nft Name",
    NftSymbol: "TEST",
    NftImage: "ipfs://QmUzSR5yDqtsjnzfvfFZWe2JyEryhm7UgUfhKr9pkokG7C",

    RewardMgr: "0x674f98D7a3b41170932b2241FFaa38b5eD484D3a",
    RewardMgrInitNfts: 2,

    MaxNftUseCount: 5,
    NftBuyPrice: ethers.parseEther("1"),
    nftCdSec: 180,
    pairingLimit: 1,
    pairingChance: 50,
    PaymentToken: "0x4200000000000000000000000000000000000022"
}