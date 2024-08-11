import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { ethers, hre } from "hardhat";
import { deployConfig as testCfg } from "../deploy-test.config";

import * as utils from "../scripts/deploy";

describe("MintFacet Test", async () => {
  let mintFacet: Contract;
  let nftToken: Contract;
  let paymentToken: Contract;

  let accounts: Signer[];
  let rewardManager;
  let rewardManagerAddr;

  let nftAddress: string;
  let paymentTokenAddress: string;

  let user1;
  let user2;
  let user1Addr;
  let user2Addr;
  let id1;
  let id2;
  let id3;

  let tx;

  before(async () => {
    const gas = { totalGasUsed: 0n };
    let contracts = await utils.main(true, gas);
    nftAddress = contracts[0];
    paymentTokenAddress = contracts[1];

    accounts = await ethers.getSigners();
    rewardManager = accounts[1];
    rewardManagerAddr = await rewardManager.getAddress();

    user1 = accounts[2];
    user2 = accounts[3];
    user1Addr = await user1.getAddress();
    user2Addr = await user2.getAddress();
    id1 = 0;
    id2 = 1;
    id3 = 2;

    mintFacet = await ethers.getContractAt(
      "MintFacet",
      nftAddress,
      accounts[0],
    );
    nftToken = await ethers.getContractAt("NftToken", nftAddress, accounts[0]);
    paymentToken = await ethers.getContractAt(
      "PaymentERC20",
      paymentTokenAddress,
      accounts[0],
    );
  });

  it("Mint Initial", async () => {
    tx = mintFacet
      .connect(rewardManager)
      .mint(ethers.ZeroAddress, id1, user2Addr, id2);
    await expect(tx).to.be.revertedWith("MintFacet: rev1 invalid address");

    tx = mintFacet
      .connect(rewardManager)
      .mint(user1Addr, id1, ethers.ZeroAddress, id2);
    await expect(tx).to.be.revertedWith("MintFacet: rev2 invalid address");

    tx = mintFacet.connect(rewardManager).mint(user1Addr, id1, user1Addr, id2);
    await expect(tx).to.be.revertedWith(
      "MintFacet: rev1 and rev2 should be different",
    );

    tx = mintFacet.connect(rewardManager).mint(user1Addr, id1, user2Addr, id2);
    await expect(tx).to.be.revertedWith("MintFacet: rev1 is not owner of id1");

    await nftToken
      .connect(rewardManager)
      .transferFrom(rewardManagerAddr, user1Addr, id1);
    tx = mintFacet.connect(rewardManager).mint(user1Addr, id1, user2Addr, id2);
    await expect(tx).to.be.revertedWith("MintFacet: rev2 is not owner of id2");

    await nftToken
      .connect(rewardManager)
      .transferFrom(rewardManagerAddr, user2Addr, id2);
    await mintFacet.connect(rewardManager).mint(user1Addr, id1, user2Addr, id2); //Successful

    expect(await nftToken.totalSupply()).to.be.equal(3);
    expect(await mintFacet.getUseCount(id1)).to.be.equal(1);
    expect(await mintFacet.getUseCount(id2)).to.be.equal(1);
    expect(await mintFacet.getUseCount(id3)).to.be.equal(0);
    expect(await mintFacet.getPairUsedCount(id1, id2)).to.be.equal(1);
    expect(await mintFacet.getPairUsedCount(id1, id3)).to.be.equal(0);
    expect(await mintFacet.getNextIdInQueue()).to.be.equal(id3);

    expect((await mintFacet.getNftRevenues(id3)).length).to.be.equal(2);
    let revs = await mintFacet.getNftRevenues(id3);
    expect(revs[0]).to.be.equal(user1Addr);
    expect(revs[1]).to.be.equal(user2Addr);
  });

  it("Try Mint In CoolDown", async () => {
    tx = mintFacet.connect(rewardManager).mint(user1Addr, id1, user2Addr, id2);
    await expect(tx).to.be.revertedWith("MintFacet: id1 Nft is in cooldown");

    expect(await mintFacet.getTimeUntilNextMint(id1)).to.be.above(0);
    await time.increase(testCfg.nftCdSec);

    tx = mintFacet.connect(rewardManager).mint(user1Addr, id1, user2Addr, id2);
    await expect(tx).to.be.revertedWith(
      "MintFacet: pairing limit reached for these nfts",
    );
  });

  it("purchaseNft Test", async () => {
    tx = mintFacet.connect(user1).purchaseNft();
    await expect(tx).to.be.revertedWith(
      "MintFacet: Insufficient sender balance",
    );

    await paymentToken.connect(user1).mint(testCfg.NftBuyPrice);

    tx = mintFacet.connect(user1).purchaseNft();
    await expect(tx).to.be.revertedWith(
      "MintFacet: Insufficient allowance for payment token",
    );

    await paymentToken.connect(user1).approve(nftAddress, testCfg.NftBuyPrice);
    await mintFacet.connect(user1).purchaseNft(); //Successful

    tx = mintFacet.getNextIdInQueue();
    await expect(tx).to.be.revertedWithCustomError(mintFacet, "QueueEmpty()");

    expect(await nftToken.balanceOf(user1)).to.be.equal(2);
    expect(await paymentToken.balanceOf(user1)).to.be.equal(
      (testCfg.NftBuyPrice / 100n) * 40n,
    );
    expect(await paymentToken.balanceOf(user2)).to.be.equal(
      (testCfg.NftBuyPrice / 100n) * 40n,
    );
    expect(await paymentToken.balanceOf(rewardManager)).to.be.equal(
      (testCfg.NftBuyPrice / 100n) * 20n,
    );
  });
});
