// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {DoubleEndedQueue} from "@openzeppelin/contracts/utils/structs/DoubleEndedQueue.sol";

import {Modifiers} from "../libraries/LibAppStorage.sol";
import {LibNftPairing} from "../libraries/LibNftPairing.sol";

contract MintFacet is Modifiers {
    using DoubleEndedQueue for DoubleEndedQueue.Bytes32Deque;

    function getUseCount(uint256 id_) external view returns (uint256) {
        return s.useCount[id_];
    }

    function getPairUsedCount(
        uint256 id1_,
        uint256 id2_
    ) external view returns (uint256) {
        bytes32 key = keyForIdsPair(id1_, id2_);
        return s.pairUsedCount[key];
    }

    function getNftRevenues(
        uint256 id_
    ) external view returns (address[2] memory) {
        return s.nftRevenues[id_];
    }

    function getNextIdInQueue() external view returns (uint256) {
        return uint256(s.idsQueue.front());
    }

    function getTimeUntilNextMint(uint256 id_) public view returns (uint256) {
        uint256 passedTime = block.timestamp - s.lastUsedTime[id_];
        if (passedTime < s.nftCdSec) {
            return s.nftCdSec - passedTime;
        }
        return 0;
    }

    function isInCd(uint256 id_) public view returns (bool) {
        return getTimeUntilNextMint(id_) > 0;
    }

    function setRewardManager(
        address rewardManager_,
        uint256 nftCount_
    ) external onlyOwner {
        s.rewardManager = rewardManager_;
        LibNftPairing.mint(nftCount_, s.rewardManager);
    }

    function squeezeQueue() external onlyRewardManager {
        _squeezeQueue();
    }

    function mint(
        address rev1_,
        uint256 id1_,
        address rev2_,
        uint256 id2_
    ) external onlyRewardManager returns (uint256 newId) {
        require(rev1_ != rev2_, "MintFacet: rev1 and rev2 should be different");
        require(address(0) != rev1_, "MintFacet: rev1 invalid address");
        require(address(0) != rev2_, "MintFacet: rev2 invalid address");
        require(s.owners[id1_] == rev1_, "MintFacet: rev1 is not owner of id1");
        require(s.owners[id2_] == rev2_, "MintFacet: rev2 is not owner of id2");
        require(isInCd(id1_) == false, "MintFacet: id1 Nft is in cooldown");
        require(isInCd(id2_) == false, "MintFacet: id2 Nft is in cooldown");

        bytes32 key = keyForIdsPair(id1_, id2_);
        require(
            s.pairUsedCount[key] < s.pairingLimit,
            "MintFacet: pairing limit reached for these nfts"
        );

        newId = makePairedNft(rev1_, rev2_);

        incUseCount(rev1_, id1_);
        incUseCount(rev2_, id2_);

        s.lastUsedTime[id1_] = block.timestamp;
        s.lastUsedTime[id2_] = block.timestamp;
        s.pairUsedCount[key] += 1;
    }

    function keyForIdsPair(
        uint256 id1_,
        uint256 id2_
    ) internal pure returns (bytes32) {
        (uint256 elem1, uint256 elem2) = id1_ < id2_
            ? (id1_, id2_)
            : (id2_, id1_);

        return keccak256(abi.encodePacked(elem1, elem2));
    }

    function makePairedNft(
        address rev1_,
        address rev2_
    ) internal returns (uint256 newId) {
        newId = s.tokenIdsCount;
        s.nftRevenues[newId][0] = rev1_;
        s.nftRevenues[newId][1] = rev2_;

        LibNftPairing.mint(1, address(this));

        s.idsQueue.pushBack(bytes32(newId));
    }

    function incUseCount(address rev_, uint256 id_) internal {
        s.useCount[id_] += 1;
        if (s.useCount[id_] >= s.maxUseCount) {
            LibNftPairing.transfer(rev_, address(0), id_); //burn
            delete s.useCount[id_];
        }
    }

    function purchaseNft() external returns (uint256 nftId) {
        require(
            s.idsQueue.length() > 0,
            "MintFacet: Minted nfts queue is empty"
        );
        require(
            IERC20(s.paymentToken).balanceOf(msg.sender) >= s.nftBuyPrice,
            "MintFacet: Insufficient sender balance"
        );
        require(
            IERC20(s.paymentToken).allowance(msg.sender, address(this)) >=
                s.nftBuyPrice,
            "MintFacet: Insufficient allowance for payment token"
        );

        _squeezeQueue();
        nftId = uint256(s.idsQueue.popFront());
        LibNftPairing.transfer(address(this), msg.sender, nftId);

        IERC20(s.paymentToken).transferFrom(
            msg.sender,
            s.rewardManager,
            (s.nftBuyPrice / 100) * 20
        );

        IERC20(s.paymentToken).transferFrom(
            msg.sender,
            s.nftRevenues[nftId][0],
            (s.nftBuyPrice / 100) * 40
        );

        IERC20(s.paymentToken).transferFrom(
            msg.sender,
            s.nftRevenues[nftId][1],
            (s.nftBuyPrice / 100) * 40
        );

        delete s.nftRevenues[nftId];
    }

    function _squeezeQueue() internal {
        while (s.idsQueue.length() > 0) {
            uint256 id = uint256(s.idsQueue.front());
            if (s.owners[id] == address(this)) {
                return;
            }
            s.idsQueue.popFront();
        }
    }
}
