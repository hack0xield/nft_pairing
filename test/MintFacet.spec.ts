import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";
import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { ethers, hre } from "hardhat";
import { deployConfig as testCfg } from "../deploy-test.config";

import * as utils from "../scripts/deploy";

describe("MintFacet Test", async () => {
  let mintFacet: Contract;
  let nftToken: Contract;

  let accounts: Signer[];
  let rewardManager;
  let rewardManagerAddr;

  let nftAddress: string;

  let user1;
  let user2;
  let id1;
  let id2;
  let id3;
  let id4;

  let tx;

  before(async () => {
    const gas = { totalGasUsed: 0n };
    let contracts = await utils.main(true, gas);
    nftAddress = contracts[0];

    accounts = await ethers.getSigners();
    rewardManager = accounts[1];
    rewardManagerAddr = await rewardManager.getAddress();

    user1 = accounts[2];
    user2 = accounts[3];
    id1 = 0;
    id2 = 1;
    id3 = 2;
    id4 = 3;

    mintFacet = await ethers.getContractAt(
      "MintFacet",
      nftAddress,
      accounts[0],
    );
    nftToken = await ethers.getContractAt("NftToken", nftAddress, accounts[0]);
  });

  it("Mint Initial", async () => {
    tx = mintFacet
      .connect(rewardManager)
      .mint(ethers.ZeroAddress, id1, user2, id2);
    await expect(tx).to.be.revertedWith("MintFacet: rev1 invalid address");

    tx = mintFacet
      .connect(rewardManager)
      .mint(user1, id1, ethers.ZeroAddress, id2);
    await expect(tx).to.be.revertedWith("MintFacet: rev2 invalid address");

    tx = mintFacet.connect(rewardManager).mint(user1, id1, user1, id2);
    await expect(tx).to.be.revertedWith(
      "MintFacet: rev1 and rev2 should be different",
    );

    tx = mintFacet.connect(rewardManager).mint(user1, id1, user2, id2);
    await expect(tx).to.be.revertedWith("MintFacet: rev1 is not owner of id1");

    await nftToken
      .connect(rewardManager)
      .transferFrom(rewardManagerAddr, user1, id1);
    tx = mintFacet.connect(rewardManager).mint(user1, id1, user2, id2);
    await expect(tx).to.be.revertedWith("MintFacet: rev2 is not owner of id2");

    await nftToken
      .connect(rewardManager)
      .transferFrom(rewardManagerAddr, user2, id2);
    tx = await mintFacet.connect(rewardManager).mint(user1, id1, user2, id2); //Successful
    await expect(tx).to.emit(mintFacet, "NftMint").withArgs(id1, id2, id3);

    expect(await nftToken.totalSupply()).to.be.equal(3);
    expect(await mintFacet.getUseCount(id1)).to.be.equal(1);
    expect(await mintFacet.getUseCount(id2)).to.be.equal(1);
    expect(await mintFacet.getUseCount(id3)).to.be.equal(0);
    expect(await mintFacet.getPairUsedCount(id1, id2)).to.be.equal(1);
    expect(await mintFacet.getPairUsedCount(id1, id3)).to.be.equal(0);
    expect(await mintFacet.getNextIdInQueue()).to.be.equal(id3);

    expect((await mintFacet.getNftRevenues(id3)).length).to.be.equal(2);
    let revs = await mintFacet.getNftRevenues(id3);
    expect(revs[0]).to.be.equal(user1);
    expect(revs[1]).to.be.equal(user2);
  });

  it("Try Mint In CoolDown", async () => {
    tx = mintFacet.connect(rewardManager).mint(user1, id1, user2, id2);
    await expect(tx).to.be.revertedWith("MintFacet: id1 Nft is in cooldown");

    expect(await mintFacet.getTimeUntilNextMint(id1)).to.be.above(0);
    await time.increase(testCfg.nftCdSec);

    tx = mintFacet.connect(rewardManager).mint(user1, id1, user2, id2);
    await expect(tx).to.be.revertedWith(
      "MintFacet: pairing limit reached for these nfts",
    );
  });

  it("purchaseNft Test", async () => {
    let balanceBefore1 = await ethers.provider.getBalance(user1);
    let balanceBefore2 = await ethers.provider.getBalance(user2);
    let balanceBeforeContract = await ethers.provider.getBalance(nftAddress);

    tx = await mintFacet
      .connect(user1)
      .purchaseNft({ value: testCfg.NftBuyPrice }); //Successful
    await expect(tx).to.emit(mintFacet, "NftPurchase").withArgs(user1, id3);

    tx = mintFacet.getNextIdInQueue();
    await expect(tx).to.be.revertedWithCustomError(mintFacet, "QueueEmpty()");

    expect(await nftToken.balanceOf(user1)).to.be.equal(2);

    let balanceAfter1 = await ethers.provider.getBalance(user1);
    let balanceAfter2 = await ethers.provider.getBalance(user2);
    let balanceAfterContract = await ethers.provider.getBalance(nftAddress);

    expect(balanceBefore1 - balanceAfter1).closeTo( //user1 has less than before
      (testCfg.NftBuyPrice / 100n) * 60n, //user1 spent 100% but regain 40, 100-40=60
      ethers.parseEther("0.001"),
    );
    expect(balanceAfter2 - balanceBefore2).closeTo(
      (testCfg.NftBuyPrice / 100n) * 40n,
      ethers.parseEther("0.001"),
    );
    expect(balanceAfterContract - balanceBeforeContract).closeTo(
      (testCfg.NftBuyPrice / 100n) * 20n,
      ethers.parseEther("0.001"),
    );
  });

  it("purchaseRefNft Test", async () => {
    tx = await mintFacet.connect(rewardManager).mint(user1, id3, user2, id2); //Successful
    await expect(tx).to.emit(mintFacet, "NftMint").withArgs(id3, id2, id4);

    const address = await user2.getAddress();
    const msg = ethers.solidityPackedKeccak256(
      ["address", "uint256"],
      [address, id4],
    );
    const sig1 = await rewardManager.provider.send("eth_sign", [
      rewardManagerAddr,
      msg,
    ]);

    tx = await mintFacet.connect(user2).purchaseRefNft(id4, sig1, {
      value: testCfg.NftBuyPrice,
    });
    await expect(tx).to.emit(mintFacet, "NftPurchase").withArgs(user2, id4);
  });
});
