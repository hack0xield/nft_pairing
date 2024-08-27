import { ethers } from "hardhat";
import { strDisplay } from "./shared/utils";
import { DeployInfra as infra } from "./shared/deployInfra";
import { deployConfig as cfg } from "../deploy.config";
import { deployConfig as testCfg } from "../deploy-test.config";

export async function main(
  tests: boolean,
  gas: { totalGasUsed: BigInt },
) {
  const LOG = !tests ? console.log.bind(console) : function () {};
  //const LOG = console.log.bind(console);
  const accounts = await ethers.getSigners();
  const account = await accounts[0].getAddress();
  const rewardManager = accounts[1];

  infra.LOG = LOG;
  infra.gas = gas;

  LOG("");
  LOG(`> NFt Deploy: account owner: ${account}`);

  if (tests == true) {
    cfg = testCfg;
  }
  const rewardManagerAddr = tests
    ? await rewardManager.getAddress()
    : cfg.RewardMgr;

  let nftAddress;
  await deployNft();

  LOG(`> Total gas used: ${strDisplay(gas.totalGasUsed)}`);

  return [nftAddress];

  async function deployNft() {
    const [nftTokenArgs, mintFacetArgs] = await infra.deployFacets(
      "NftToken",
      "MintFacet",
    );

    nftAddress = await infra.deployDiamond(
      "NftPairing",
      "contracts/NftPairing/InitDiamond.sol:InitDiamond",
      account,
      [nftTokenArgs, mintFacetArgs],
      [
        [
          cfg.NftName,
          cfg.NftSymbol,
          cfg.NftImage,
          cfg.MaxNftUseCount,
          cfg.NftBuyPrice,
          cfg.nftCdSec,
          cfg.pairingLimit,
        ],
      ],
    );

    {
      const nftMint = await ethers.getContractAt(
        "MintFacet",
        nftAddress,
        accounts[0],
      );
      const tx = await (
        await nftMint.setRewardManager(rewardManagerAddr, cfg.RewardMgrInitNfts)
      ).wait();
      LOG(`>> setRewardManager gas used: ${strDisplay(tx.gasUsed)}`);
      gas.totalGasUsed += tx.gasUsed;
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  const gas = { totalGasUsed: 0n };
  main(false, gas).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
