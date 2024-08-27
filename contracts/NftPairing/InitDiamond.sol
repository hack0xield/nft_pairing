// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1363Receiver} from "@openzeppelin/contracts/interfaces/IERC1363Receiver.sol";

import {AppStorage} from "./libraries/LibAppStorage.sol";
import {IERC721TokenIds} from "../shared/interfaces/IERC721TokenIds.sol";
import {LibDiamond} from "../shared/diamond/lib/LibDiamond.sol";
import {IOwnable} from "../shared/diamond/interfaces/IOwnable.sol";
import {IDiamondCut} from "../shared/diamond/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../shared/diamond/interfaces/IDiamondLoupe.sol";

contract InitDiamond {
    AppStorage internal s;

    struct Args {
        string name;
        string symbol;
        string cloneBoxURI;

        uint256 maxUseCount;
        uint256 nftBuyPrice;
        uint256 nftCdSec;
        uint256 pairingLimit;
    }

    function init(Args memory args_) external {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IERC1363Receiver).interfaceId] = true;
        ds.supportedInterfaces[type(IERC721).interfaceId] = true;
        ds.supportedInterfaces[type(IERC721TokenIds).interfaceId] = true;
        ds.supportedInterfaces[type(IOwnable).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;

        s.name = args_.name;
        s.symbol = args_.symbol;
        s.cloneBoxURI = args_.cloneBoxURI;

        s.maxUseCount = args_.maxUseCount;
        s.nftBuyPrice = args_.nftBuyPrice;
        s.nftCdSec = args_.nftCdSec;
        s.pairingLimit = args_.pairingLimit;
    }
}
