const { expect } = require('chai');
const { ethers } = require('hardhat');


const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether');
}

const ether = tokens

describe('Real Estate', () => {
    let realEstate, escrow;
    let deployer, seller, buyer;
    let nftID = 1;
    let purchasePrice = ether(100);
    let escrowAmount = ether(20);

    beforeEach(async () => {

        // Setup accounts
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        seller = deployer;
        buyer = accounts[1];
        inspector = accounts[2];
        lender = accounts[3];

        // Load contracts
        const RealEstate = await ethers.getContractFactory('RealEstate')
        const Escrow = await ethers.getContractFactory('Escrow')

        // Deploy contracts
        realEstate = await RealEstate.deploy();
        escrow = await Escrow.deploy(
            realEstate.address, 
            nftID,
            purchasePrice,
            escrowAmount,
            seller.address,
            buyer.address,
            inspector.address,
            lender.address
        );

        // Seller Approves NFT
        transaction = await realEstate.connect(seller).approve(escrow.address, nftID)
        await transaction.wait()
    })

    describe('Deployment', async () => {
        it('sends an NFT to the seller / deployer', async () => {
            expect(await realEstate.ownerOf(nftID)).to.equal(seller.address);
        })
    })

    describe('Selling real estate', async () => {
        let balance, transaction;

        it('executes a successful transaction', async () => {
            // expects seller to be NFT owner before the sale
            expect(await realEstate.ownerOf(nftID)).to.equal(seller.address);

            // Check escrow balance
            balance = await escrow.getBalance();
            console.log('escrow balance: ', ethers.utils.formatEther(balance));
            expect(balance).to.equal(0);

            // Buyer deposits earnest
            transaction = await escrow.connect(buyer).depositEarnest({ value: escrowAmount })
            console.log("Buyer deposits earnest");

            // Check escrow balance
            balance = await escrow.getBalance();
            console.log('escrow balance: ', ethers.utils.formatEther(balance));
            expect(balance).to.equal(escrowAmount);

            // Inspector updates status
            inspection = await escrow.connect(inspector).updateInspectionStatus(true);
            await inspection.wait();
            expect(await escrow.inspectionPassed()).to.equal(true);
            console.log(await escrow.inspectionPassed());

            // Approve sale
            await escrow.connect(seller).approveSale();
            console.log('Seller approves sale');
            await escrow.connect(buyer).approveSale();
            console.log('Buyer approves sale');

            // Lender funds sale - sends funds to escrow contract
            transaction = await lender.sendTransaction({ to: escrow.address, value: ether(80) })

            // Lender approves sale
            await escrow.connect(lender).approveSale();
            console.log('Lender approves sale');

            // Finalize sale - specify address of buyer (the signer)
            transaction = await escrow.connect(buyer).finalizeSale();
            await transaction.wait()
            expect(await realEstate.ownerOf(nftID)).to.equal(buyer.address);
            console.log('Buyer finalizes sale');

            // expects buyer to be NFT owner after the sale
            expect(await realEstate.ownerOf(nftID)).to.equal(buyer.address);

            // expects seller to have proceeds from sale
            balance = await ethers.provider.getBalance(seller.address)
            console.log("Seller balance: ", ethers.utils.formatEther(balance))
            expect(balance).to.be.above(ether(10099));
        })
    })
})