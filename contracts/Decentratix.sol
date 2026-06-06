// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Decentratix
 * @notice NFT-based ticketing contract with capped secondary pricing, automatic royalties,
 *         and scan-locking to prevent post-entry transfers.
 */
contract Decentratix is ERC721URIStorage, ReentrancyGuard, Ownable {
    struct TicketMeta {
        uint256 facePrice;
        bool isScanned;
        bool listed;
        uint256 askPrice;
    }

    uint96 public immutable maxMarkupBps;
    uint96 public immutable royaltyBps;
    address public immutable organizer;
    address public scanner;

    uint256 public nextTokenId;
    bool private marketTransferInProgress;

    mapping(uint256 => TicketMeta) public tickets;

    event TicketMinted(uint256 indexed tokenId, address indexed holder, uint256 facePrice);
    event TicketListed(uint256 indexed tokenId, address indexed seller, uint256 askPrice);
    event TicketSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 royaltyPaid
    );
    event TicketDelisted(uint256 indexed tokenId, address indexed seller);
    event TicketScanned(uint256 indexed tokenId, address indexed scannedBy);
    event ScannerUpdated(address indexed scanner);

    error InvalidAddress();
    error InvalidBps();
    error NotTokenOwner();
    error TicketAlreadyScanned();
    error TicketNotListed();
    error InvalidAskPrice();
    error WrongPayment();
    error UnauthorizedScanner();
    error TransfersDisabled();

    modifier onlyScanner() {
        if (msg.sender != scanner) revert UnauthorizedScanner();
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        address organizer_,
        address scanner_,
        uint96 maxMarkupBps_,
        uint96 royaltyBps_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        if (organizer_ == address(0) || scanner_ == address(0)) revert InvalidAddress();
        if (maxMarkupBps_ > 5_000 || royaltyBps_ > 10_000) revert InvalidBps();

        organizer = organizer_;
        scanner = scanner_;
        maxMarkupBps = maxMarkupBps_;
        royaltyBps = royaltyBps_;
    }

    function mintTicket(address to, uint256 facePrice, string calldata tokenURI_) external onlyOwner returns (uint256) {
        if (to == address(0)) revert InvalidAddress();
        if (facePrice == 0) revert InvalidAskPrice();

        uint256 tokenId = ++nextTokenId;
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        tickets[tokenId] = TicketMeta({
            facePrice: facePrice,
            isScanned: false,
            listed: false,
            askPrice: 0
        });

        emit TicketMinted(tokenId, to, facePrice);
        return tokenId;
    }

    function listForResale(uint256 tokenId, uint256 askPrice) external {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();

        TicketMeta storage ticket = tickets[tokenId];
        if (ticket.isScanned) revert TicketAlreadyScanned();

        uint256 maxAllowed = maxResalePrice(tokenId);
        if (askPrice == 0 || askPrice > maxAllowed) revert InvalidAskPrice();

        ticket.listed = true;
        ticket.askPrice = askPrice;

        emit TicketListed(tokenId, msg.sender, askPrice);
    }

    function delist(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();

        TicketMeta storage ticket = tickets[tokenId];
        if (!ticket.listed) revert TicketNotListed();

        ticket.listed = false;
        ticket.askPrice = 0;

        emit TicketDelisted(tokenId, msg.sender);
    }

    function buyListedTicket(uint256 tokenId) external payable nonReentrant {
        TicketMeta storage ticket = tickets[tokenId];
        if (ticket.isScanned) revert TicketAlreadyScanned();
        if (!ticket.listed) revert TicketNotListed();

        address seller = ownerOf(tokenId);
        if (seller == msg.sender) revert NotTokenOwner();
        if (msg.value != ticket.askPrice) revert WrongPayment();

        uint256 royalty = (msg.value * royaltyBps) / 10_000;
        uint256 sellerPayout = msg.value - royalty;

        ticket.listed = false;
        ticket.askPrice = 0;

        marketTransferInProgress = true;
        _transfer(seller, msg.sender, tokenId);
        marketTransferInProgress = false;

        (bool royaltySent, ) = payable(organizer).call{value: royalty}("");
        require(royaltySent, "Royalty transfer failed");

        (bool sellerPaid, ) = payable(seller).call{value: sellerPayout}("");
        require(sellerPaid, "Seller payout failed");

        emit TicketSold(tokenId, seller, msg.sender, msg.value, royalty);
    }

    function scanAndLockTicket(uint256 tokenId) external onlyScanner {
        TicketMeta storage ticket = tickets[tokenId];
        if (ticket.isScanned) revert TicketAlreadyScanned();

        ticket.isScanned = true;
        ticket.listed = false;
        ticket.askPrice = 0;

        emit TicketScanned(tokenId, msg.sender);
    }

    function setScanner(address newScanner) external onlyOwner {
        if (newScanner == address(0)) revert InvalidAddress();
        scanner = newScanner;
        emit ScannerUpdated(newScanner);
    }

    function maxResalePrice(uint256 tokenId) public view returns (uint256) {
        TicketMeta storage ticket = tickets[tokenId];
        return (ticket.facePrice * (10_000 + maxMarkupBps)) / 10_000;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        bool isTransfer = _ownerOf(tokenId) != address(0) && to != address(0);

        if (isTransfer) {
            TicketMeta storage ticket = tickets[tokenId];
            // Secondary transfers are only allowed through the marketplace buy flow.
            if (ticket.isScanned) revert TicketAlreadyScanned();
            if (!marketTransferInProgress) revert TransfersDisabled();
        }

        from = super._update(to, tokenId, auth);
    }
}
