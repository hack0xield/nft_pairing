// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {LibDiamond} from "../../shared/diamond/lib/LibDiamond.sol";
import {DoubleEndedQueue} from "@openzeppelin/contracts/utils/structs/DoubleEndedQueue.sol";

struct AppStorage {
    string name;
    string symbol;
    string baseURI;
    string cloneBoxURI;

    address rewardManager;

    //Indexes
    mapping(uint256 => address) owners;
    //mapping(address => uint256) balances;
    mapping(address => uint256[]) ownerTokenIds;
    mapping(address => mapping(uint256 => uint256)) ownerTokenIdIndexes;
    uint256 tokenIdsCount;

    //Approval
    mapping(uint256 => address) approved;
    mapping(address => mapping(address => bool)) operators;

    // Nft Pairing
    uint256 maxUseCount;
    uint256 nftBuyPrice;
    uint256 nftCdSec;
    uint256 pairingLimit;

    mapping(uint256 => uint256) useCount;
    mapping(uint256 => uint256) lastUsedTime;
    mapping(bytes32 => uint256) pairUsedCount;
    mapping(uint256 => address[2]) nftRevenues;
    DoubleEndedQueue.Bytes32Deque idsQueue;
}

library LibAppStorage {
    function diamondStorage() internal pure returns (AppStorage storage ds) {
        assembly {
            ds.slot := 0
        }
    }
}

contract Modifiers {
    AppStorage internal s;

    modifier onlyOwner() {
        require(
            LibDiamond.contractOwner() == msg.sender,
            "LibAppStorage: Only owner"
        );
        _;
    }

    modifier onlyRewardManager() {
        require(
            s.rewardManager == msg.sender,
            "LibAppStorage: Only reward manager"
        );
        _;
    }
}
