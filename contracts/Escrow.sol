// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// function imports a smart contract to use its function
interface IERC721 {
    function transferFrom(address _from, address _to, uint _id) external;
}

contract Escrow {
    address public nftAddress;
    uint public nftID;
    uint public purchasePrice;
    uint public escrowAmount;
    address payable public seller;
    address payable public buyer;
    address public inspector;
    address public lender;
    bool public inspectionPassed = false;
    mapping(address => bool) public approval; 

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only buyer can call this function");
        _;
    }

    modifier onlyInspector() {
        require(msg.sender == inspector);
        _;
    }

    // Let's smart contract receive fundss
    receive() external payable {}

    constructor(
        address _nftAddress, 
        uint _nftID,
        uint _purchasePrice,
        uint _escrowAmount,
        address payable _seller, 
        address payable _buyer,
        address _inspector,
        address _lender
    ) {
        nftAddress = _nftAddress;
        nftID = _nftID;
        purchasePrice = _purchasePrice;
        escrowAmount = _escrowAmount;
        seller = _seller;
        buyer = _buyer;
        inspector = _inspector;
        lender = _lender;
    }
    
    function depositEarnest() public payable onlyBuyer {
        require(msg.value >= escrowAmount, "Must deposit escrow");
        require(msg.sender == buyer, "Only buyer can call this function");
    }

    function updateInspectionStatus(bool _passed) public onlyInspector {
        inspectionPassed = _passed;
    }

    function approveSale() public {
        approval[msg.sender] = true;
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    function cancelSale() public {
        if (inspectionPassed == false) {
            buyer.transfer(address(this).balance);
        } else {
            // earnest money goes to the seller
            buyer.transfer(address(this).balance);
        }
    }

    function finalizeSale() public {
        require(inspectionPassed, "Must pass inspection");
        require(approval[buyer], "Must be approved by buyer");
        require(approval[seller], "Must be approved by seller");
        require(approval[lender], "Must be approved by lender");
        require(address(this).balance >= purchasePrice, "Must have enough ether for sale");

        seller.transfer(address(this).balance);
        // (bool success, ) = payable(seller).call{value: address(this).balance}("");
        // require(success);
        
        // Transfer ownership of property
        IERC721(nftAddress).transferFrom(seller, buyer, nftID);
    }

}