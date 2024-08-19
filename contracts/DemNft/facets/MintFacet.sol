// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {Modifiers} from "../libraries/LibAppStorage.sol";
import {LibDemNft} from "../libraries/LibDemNft.sol";

contract MintFacet is Modifiers {
    function setRewardManager(address rewardManager_, uint256 nftCount) external onlyOwner {
        s.rewardManager = rewardManager_;
        LibDemNft.mint(nftCount, s.rewardManager);
    }

    function mint(
        address rev1,
        uint256 id1,
        address rev2,
        uint256 id2
    ) external onlyRewardManager {
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

    function purchaseNft(
        address buyer,
        uint256 id
    ) external onlyRewardManager {
        require(
            s.owners[id] == s.rewardManager,
            "MintFacet: nft already bought or not exist"
        );
        require(s.balances[buyer] == 0, "MintFacet: buyer balance is not zero");
        require(
            IERC20(s.paymentToken).balanceOf(buyer) >= s.nftBuyPrice,
            "MintFacet: Insufficient buyer balance"
        );

        bool success = IERC20(s.paymentToken).transferFrom(
            buyer,
            address(this),
            (s.nftBuyPrice / 100) * 20
        );
        require(success, "Token transfer failed");

        if (buyer != s.nftRevenues[id][0]) {
            success = IERC20(s.paymentToken).transferFrom(
                buyer,
                s.nftRevenues[id][0],
                (s.nftBuyPrice / 100) * 40
            );
            require(success, "Token transfer failed");
        }

        if (buyer != s.nftRevenues[id][1]) {
            success = IERC20(s.paymentToken).transferFrom(
                buyer,
                s.nftRevenues[id][1],
                (s.nftBuyPrice / 100) * 40
            );
            require(success, "Token transfer failed");
        }

        LibDemNft.transfer(s.rewardManager, buyer, id);
    }

    function withdraw() external onlyRewardManager {
        uint256 balance = address(this).balance;
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "MintFacet: Withdraw failed");
    }
}
