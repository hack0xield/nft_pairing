// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Modifiers} from "../libraries/LibAppStorage.sol";
import {LibDemNft} from "../libraries/LibDemNft.sol";

contract MintFacet is Modifiers {
    function setRewardManager(address rewardManager_) external onlyOwner {
        s.rewardManager = rewardManager_;
    }

    function mint(address rev1, uint256 id1, address rev2, uint256 id2) external onlyRewardManager {
        require(s.owners[id1] == rev1, "MintFacet: rev1 is not owner of id1");
        require(s.owners[id2] == rev2, "MintFacet: rev2 is not owner of id2");

        LibDemNft.mint(1, s.rewardManager);

        uint256 newNftId = s.tokenIdsCount - 1;
        s.nftRevenues[newNftId][0] = rev1;
        s.nftRevenues[newNftId][1] = rev2;

        incUseCount(rev1, id1);
        incUseCount(rev2, id2);
    }

    function incUseCount(address rev, uint256 id) internal {
        s.useCount[rev] += 1;

        if (s.useCount[rev] >= s.maxUseCount) {
            LibDemNft.transfer(rev, address(0), id); //burn
            s.useCount[rev] = 0;
        }
    }

    function buy(uint256 id, address to) external payable onlyRewardManager {
        require(s.owners[id] == s.rewardManager, "MintFacet: nft already bought");
        require(s.balances[to] == 0, "MintFacet: to balance is not zero");
        require(
            s.nftBuyPrice == msg.value,
            "MintFacet: Incorrect ethers value"
        );

        LibDemNft.transfer(s.rewardManager, to, id);

        (bool success, ) = s.nftRevenues[id][0].call{value: msg.value / 100 * 40}("");
        require(success, "MintFacet: Eth send 1 failed");

        (success, ) = s.nftRevenues[id][1].call{value: msg.value / 100 * 40}("");
        require(success, "MintFacet: Eth send 2 failed");
    }

    function withdraw() external onlyRewardManager {
        uint256 balance = address(this).balance;
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "MintFacet: Withdraw failed");
    }
}
