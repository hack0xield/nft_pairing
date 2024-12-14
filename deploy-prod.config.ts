import {ethers} from "hardhat";

export let deployConfig = {
    NftName: "Degenoleptics RED",
    NftSymbol: "REDPACK",
    NftImage: "ipfs://QmNxoKNhU5nXaNQceGYofUQyPfDBaeCNzHkQu72MqY4dHm",

    RewardMgr: "0x1493EdAb2Bc5c2d24674288282B7D45527BaBD85",
    RewardMgrInitNfts: 2,

    MaxNftUseCount: 5,
    NftBuyPrice: ethers.parseEther("0.001"),
    nftCdSec: 300,
    pairingLimit: 1,
}