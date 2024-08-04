import {ethers} from "hardhat";

export let deployConfig = {
    NftName: "Nft Name",
    NftSymbol: "TEST",
    NftImage: "ipfs://QmUzSR5yDqtsjnzfvfFZWe2JyEryhm7UgUfhKr9pkokG7C",

    RewardMgr: "0x8C07e7c7bfCCAC4d0B06938F5889e3621626FeFa",

    MaxNftUseCount: 5,
    NftBuyPrice: ethers.parseEther("1"),
    PaymentToken: "0x4200000000000000000000000000000000000022"
}