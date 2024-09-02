import {ethers} from "hardhat";

export let deployConfig = {
    NftName: "Degenoleptics RED",
    NftSymbol: "REDPACK",
    NftImage: "ipfs://QmNxoKNhU5nXaNQceGYofUQyPfDBaeCNzHkQu72MqY4dHm",

    RewardMgr: "0xcFD87f74DcDba89a49784F0C4dA5AE45188e1730",
    RewardMgrInitNfts: 2,

    MaxNftUseCount: 5,
    NftBuyPrice: ethers.parseEther("0.025"),
    nftCdSec: 10800,
    pairingLimit: 1,
}