var Token = artifacts.require("MFC_Token");
var Controller = artifacts.require("ICO_controller");
var Holder = artifacts.require("Holder");
var TokenHolder = artifacts.require("TokenHolder");
var WhitelistedCrowdsale = artifacts.require("WhitelistedCrowdsale");
var BigNumber = require('bignumber.js');
var wait = require('./utils').wait;


contract('ICO Private Offer', async function (accounts) {
    it("test Private Offer stage", async function () {
        let controller_instance = await Controller.deployed();
        let startTime = Math.ceil(Date.now() / 1000);
        let endTime = Math.ceil(Date.now() / 1000) + 100;
        let escrowAddress = accounts[5];
        let escrowAddressInitialBalance = BigNumber(await web3.eth.getBalance(escrowAddress));
        let buyerAddress = accounts[2];
        await controller_instance.startPrivateOffer(
            startTime,
            endTime,
            escrowAddress);
        let privateOffer = await WhitelistedCrowdsale.at(await controller_instance.privateOffer.call());
        let token = await Token.at(await controller_instance.token.call());
        wait(1);
        try {
            await privateOffer.sendTransaction({
                from: buyerAddress,
                value: web3.toWei(10, 'ether')
            });
            assert.ifError("Error, not whitlisted buyers shouldn't be able to buy tokens");
        } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert', "Expected rever error after buying tokens as not KYC");
        }
        await controller_instance.addBuyers([buyerAddress]);

        try {
            await privateOffer.sendTransaction({
                from: buyerAddress,
                value: web3.toWei(9.9, 'ether')
            });
            assert.ifError('Error, mininmum amount of ETH at private offer stage is 10 ETH');
        } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert', "Expected rever error after sending too small amount of ether");
        }

        try {
            await privateOffer.sendTransaction({
                from: buyerAddress,
                value: web3.toWei(201, 'ether')
            });
            assert.ifError('Error, maximum amount of ETH at private offer stage is 200 ETH');
        } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert', "Expected rever error after sending too big amount of ether");
        }


        await privateOffer.sendTransaction({from: buyerAddress, value: web3.toWei(10, 'ether')});
        let expectedTokenBalance = BigNumber(web3.toWei(120000, 'ether'));
        let actualTokenBalance = await token.balanceOf(buyerAddress);
        assert.isTrue(expectedTokenBalance.isEqualTo(actualTokenBalance), "Wrong balance for purchase without bonus");

        await privateOffer.sendTransaction({from: buyerAddress, value: web3.toWei(25, 'ether')});
        expectedTokenBalance = expectedTokenBalance.plus(BigNumber(web3.toWei(345000, 'ether')));
        actualTokenBalance = await token.balanceOf(buyerAddress);
        assert.isTrue(expectedTokenBalance.isEqualTo(actualTokenBalance), "Wrong balance for purchase with 15% bonus");

        await privateOffer.sendTransaction({from: buyerAddress, value: web3.toWei(100, 'ether')});
        expectedTokenBalance = expectedTokenBalance.plus(BigNumber(web3.toWei(1440000, 'ether')));
        actualTokenBalance = await token.balanceOf(buyerAddress);
        assert.isTrue(expectedTokenBalance.isEqualTo(actualTokenBalance), "Wrong balance for purchase with 20% bonus");

        let expectedEthBalance = BigNumber(web3.toWei(135, 'ether'));
        let actualEthBalance = BigNumber(await web3.eth.getBalance(escrowAddress)).minus(escrowAddressInitialBalance);
        assert.isTrue(expectedEthBalance.isEqualTo(actualEthBalance), "Wrong Ethereum balance of escrow address");

        let expectedBuyerSpent = BigNumber(0);
        let actualBuyerSpent = BigNumber(await controller_instance.buyerSpent(buyerAddress));
        assert.isTrue(expectedBuyerSpent.isEqualTo(actualBuyerSpent), "Wrong Buyer Spent amount for private offer");
    });
});

contract('ICO Presale', async function (accounts) {
    it("test Presale stage", async function () {
        let controller_instance = await Controller.deployed();
        let token = await Token.at(await controller_instance.token.call());
        let escrowAddress = controller_instance.address;
        let escrowAddressInitialBalance = BigNumber(await web3.eth.getBalance(escrowAddress));
        let buyerAddress = accounts[2];

        let startTime = Math.ceil(Date.now() / 1000);
        let endTime = Math.ceil(Date.now() / 1000);
        await controller_instance.startPrivateOffer(
            startTime,
            endTime,
            escrowAddress);
        wait(2);
        startTime = Math.ceil(Date.now() / 1000);
        endTime = Math.ceil(Date.now() / 1000) + 100;
        await controller_instance.startPreSaleIco(
            startTime,
            endTime);
        wait(1);

        let preSale = await WhitelistedCrowdsale.at(await controller_instance.preSale.call());
        try {
            await preSale.sendTransaction({
                from: buyerAddress,
                value: web3.toWei(5, 'ether')
            });
            assert.ifError("Error, not whitlisted buyers shouldn't be able to buy tokens");
        } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert', "Expected rever error after buying tokens as not KYC");
        }
        await controller_instance.addBuyers([buyerAddress]);

        try {
            await preSale.sendTransaction({
                from: buyerAddress,
                value: web3.toWei(4.9, 'ether')
            });
            assert.ifError('Error, mininmum amount of ETH at presale stage is 5 ETH');
        } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert', "Expected rever error after sending too small amount of ether");
        }

        try {
            await preSale.sendTransaction({
                from: buyerAddress,
                value: web3.toWei(201, 'ether')
            });
            assert.ifError('Error, maximum amount of ETH at presale stage is 200 ETH');
        } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert', "Expected rever error after sending too big amount of ether");
        }


        await preSale.sendTransaction({from: buyerAddress, value: web3.toWei(5, 'ether')});
        let expectedTokenBalance = BigNumber(web3.toWei(50750, 'ether'));
        let actualTokenBalance = await token.balanceOf(buyerAddress);
        assert.isTrue(expectedTokenBalance.isEqualTo(actualTokenBalance), "Wrong balance for purchase without bonus");

        await preSale.sendTransaction({from: buyerAddress, value: web3.toWei(10, 'ether')});
        expectedTokenBalance = expectedTokenBalance.plus(BigNumber(web3.toWei(111650, 'ether')));
        actualTokenBalance = await token.balanceOf(buyerAddress);
        assert.isTrue(expectedTokenBalance.isEqualTo(actualTokenBalance), "Wrong balance for purchase with 10% bonus");

        await preSale.sendTransaction({from: buyerAddress, value: web3.toWei(25, 'ether')});
        expectedTokenBalance = expectedTokenBalance.plus(BigNumber(web3.toWei(291812.5, 'ether')));
        actualTokenBalance = await token.balanceOf(buyerAddress);
        assert.isTrue(expectedTokenBalance.isEqualTo(actualTokenBalance), "Wrong balance for purchase with 15% bonus");

        await preSale.sendTransaction({from: buyerAddress, value: web3.toWei(100, 'ether')});
        expectedTokenBalance = expectedTokenBalance.plus(BigNumber(web3.toWei(1218000, 'ether')));
        actualTokenBalance = await token.balanceOf(buyerAddress);
        assert.isTrue(expectedTokenBalance.isEqualTo(actualTokenBalance), "Wrong balance for purchase with 20% bonus");

        let expectedEthBalance = BigNumber(web3.toWei(140, 'ether'));
        let actualEthBalance = BigNumber(await web3.eth.getBalance(escrowAddress)).minus(escrowAddressInitialBalance);
        assert.isTrue(expectedEthBalance.isEqualTo(actualEthBalance), "Wrong Ethereum balance of escrow address");

        let expectedBuyerSpent = BigNumber(web3.toWei(140, 'ether'));
        let actualBuyerSpent = BigNumber(await controller_instance.buyerSpent(buyerAddress));
        assert.isTrue(expectedBuyerSpent.isEqualTo(actualBuyerSpent), "Wrong Buyer Spent amount for presale");
    });
});

contract('ICO Crowdsale', async function (accounts) {
    it("test Crowdsale stage", async function () {
        let controller_instance = await Controller.deployed();
        let token = await Token.at(await controller_instance.token.call());
        let escrowAddress = controller_instance.address;
        let escrowAddressInitialBalance = BigNumber(await web3.eth.getBalance(escrowAddress));
        let buyerAddress = accounts[2];

        let startTime = Math.ceil(Date.now() / 1000);
        let endTime = Math.ceil(Date.now() / 1000);
        await controller_instance.startPrivateOffer(
            startTime,
            endTime,
            escrowAddress);
        wait(2);
        startTime = Math.ceil(Date.now() / 1000);
        endTime = Math.ceil(Date.now() / 1000);
        await controller_instance.startPreSaleIco(
            startTime,
            endTime);
        wait(2);
        startTime = Math.ceil(Date.now() / 1000);
        endTime = Math.ceil(Date.now() / 1000) + 100;
        await controller_instance.startCrowdsale(
            startTime,
            endTime);
        wait(1);

        let crowdsale = await WhitelistedCrowdsale.at(await controller_instance.crowdsale.call());
        try {
            await crowdsale.sendTransaction({
                from: buyerAddress,
                value: web3.toWei(0.1, 'ether')
            });
            assert.ifError("Error, not whitlisted buyers shouldn't be able to buy tokens");
        } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert', "Expected revert error after buying tokens as not KYC");
        }
        await controller_instance.addBuyers([buyerAddress]);

        try {
            await crowdsale.sendTransaction({
                from: buyerAddress,
                value: web3.toWei(0.09, 'ether')
            });
            assert.ifError('Error, mininmum amount of ETH at crowdsale stage is 0.1 ETH');
        } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert', "Expected revert error after sending too small amount of ether");
        }

        try {
            await crowdsale.sendTransaction({
                from: buyerAddress,
                value: web3.toWei(201, 'ether')
            });
            assert.ifError('Error, maximum amount of ETH at crowdsale stage is 200 ETH');
        } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert', "Expected revert error after sending too big amount of ether");
        }


        await crowdsale.sendTransaction({from: buyerAddress, value: web3.toWei(0.1, 'ether')});
        let expectedTokenBalance = BigNumber(web3.toWei(850, 'ether'));
        let actualTokenBalance = await token.balanceOf(buyerAddress);
        assert.isTrue(expectedTokenBalance.isEqualTo(actualTokenBalance), "Wrong balance for purchase without bonus");

        await crowdsale.sendTransaction({from: buyerAddress, value: web3.toWei(10, 'ether')});
        expectedTokenBalance = expectedTokenBalance.plus(BigNumber(web3.toWei(93500, 'ether')));
        actualTokenBalance = await token.balanceOf(buyerAddress);
        assert.isTrue(expectedTokenBalance.isEqualTo(actualTokenBalance), "Wrong balance for purchase with 10% bonus");

        await crowdsale.sendTransaction({from: buyerAddress, value: web3.toWei(25, 'ether')});
        expectedTokenBalance = expectedTokenBalance.plus(BigNumber(web3.toWei(244375, 'ether')));
        actualTokenBalance = await token.balanceOf(buyerAddress);
        assert.isTrue(expectedTokenBalance.isEqualTo(actualTokenBalance), "Wrong balance for purchase with 15% bonus");

        await crowdsale.sendTransaction({from: buyerAddress, value: web3.toWei(100, 'ether')});
        expectedTokenBalance = expectedTokenBalance.plus(BigNumber(web3.toWei(1020000, 'ether')));
        actualTokenBalance = await token.balanceOf(buyerAddress);
        assert.isTrue(expectedTokenBalance.isEqualTo(actualTokenBalance), "Wrong balance for purchase with 20% bonus");

        let expectedEthBalance = BigNumber(web3.toWei(135.1, 'ether'));
        let actualEthBalance = BigNumber(await web3.eth.getBalance(escrowAddress)).minus(escrowAddressInitialBalance);
        assert.isTrue(expectedEthBalance.isEqualTo(actualEthBalance), "Wrong Ethereum balance of escrow address");

        let expectedBuyerSpent = BigNumber(web3.toWei(135.1, 'ether'));
        let actualBuyerSpent = BigNumber(await controller_instance.buyerSpent(buyerAddress));
        assert.isTrue(expectedBuyerSpent.isEqualTo(actualBuyerSpent), "Wrong Buyer Spent amount for presale");
    });
});


contract('ICO didn\'t reach Softcup', async function (accounts) {
    it("test refund function", async function () {
        let controller_instance = await Controller.deployed();
        let buyerAddress = accounts[2];
        let buyerAddress2 = accounts[3];
        let holder =
        await controller_instance.addBuyers([buyerAddress]);
        await controller_instance.addBuyers([buyerAddress2]);

        let startTime = Math.ceil(Date.now() / 1000);
        let endTime = Math.ceil(Date.now() / 1000);
        await controller_instance.startPrivateOffer(
            startTime,
            endTime,
            controller_instance.address);
        wait(2);
        startTime = Math.ceil(Date.now() / 1000);
        endTime = Math.ceil(Date.now() / 1000);
        await controller_instance.startPreSaleIco(
            startTime,
            endTime);
        wait(2);
        startTime = Math.ceil(Date.now() / 1000);
        endTime = Math.ceil(Date.now() / 1000) + 1;
        await controller_instance.startCrowdsale(
            startTime,
            endTime);
        wait(1);
        let crowdsale = await WhitelistedCrowdsale.at(await controller_instance.crowdsale.call());
        await crowdsale.sendTransaction({from: buyerAddress, value: web3.toWei(0.1, 'ether')});
        await crowdsale.sendTransaction({from: buyerAddress2, value: web3.toWei(0.1, 'ether')});
        wait(2);

        try{
            await controller_instance.refund();
            assert.ifError('Error, only investor can refund');
        } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert', "Expected revert error after wrong refund");
        }

        let beforeRefundBalance = BigNumber(await web3.eth.getBalance(buyerAddress));
        await controller_instance.refund({from:buyerAddress});
        let afterRefundBalance = BigNumber(await web3.eth.getBalance(buyerAddress));
        let balanceDiff = afterRefundBalance.minus(beforeRefundBalance);
        assert.isTrue(balanceDiff.gt(BigNumber(web3.toWei(0.09, 'ether')))
            && balanceDiff.lt(BigNumber(web3.toWei(0.1, 'ether'))),
            "Wrong refund balance");
        try{
            await controller_instance.refund({from:buyerAddress});
            assert.ifError('Error, it is possible to refund only one time');
        } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert', "Expected revert error after second refund");
        }

        beforeRefundBalance = BigNumber(await web3.eth.getBalance(buyerAddress2));
        await controller_instance.refund({from:buyerAddress2});
        afterRefundBalance = BigNumber(await web3.eth.getBalance(buyerAddress2));
        balanceDiff = afterRefundBalance.minus(beforeRefundBalance);
        assert.isTrue(balanceDiff.gt(BigNumber(web3.toWei(0.09, 'ether')))
            && balanceDiff.lt(BigNumber(web3.toWei(0.1, 'ether'))),
            "Wrong second's user refund balance");

    });
});

contract('ICO success', async function (accounts) {

    it("test ICO success", async function () {
        let controller_instance = await Controller.deployed();
        let holder = await Holder.deployed();
        let token = await Token.at(await controller_instance.token.call());
        let tokenHolder = await TokenHolder.deployed();
        let buyerAddress = accounts[2];
        let escrowAddress = accounts[4];
        let escrowAddressInitialBalance = BigNumber(await web3.eth.getBalance(escrowAddress));
        await controller_instance.addBuyers([buyerAddress]);
        let startTime = Math.ceil(Date.now() / 1000);
        let endTime = Math.ceil(Date.now() / 1000) + 1;
        await controller_instance.startPrivateOffer(
            startTime,
            endTime,
            controller_instance.address);
        wait(1);
        let privateOffer = await WhitelistedCrowdsale.at(await controller_instance.privateOffer.call());
        await privateOffer.sendTransaction({from: buyerAddress, value: web3.toWei(120, 'ether')});
        try{
            await token.transfer(accounts[0], 10, {from:buyerAddress});
            assert.ifError('Error, it is possible to transfer tokens before ICO ends');
        } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert', "Expected revert error after refund");
        }
        wait(2);
        startTime = Math.ceil(Date.now() / 1000);
        endTime = Math.ceil(Date.now() / 1000) + 1;
        await controller_instance.startPreSaleIco(
            startTime,
            endTime);
        wait(1);
        let preSale = await WhitelistedCrowdsale.at(await controller_instance.preSale.call());
        await preSale.sendTransaction({from: buyerAddress, value: web3.toWei(200, 'ether')});
        wait(2);
        startTime = Math.ceil(Date.now() / 1000);
        endTime = Math.ceil(Date.now() / 1000) + 5;
        await controller_instance.startCrowdsale(
            startTime,
            endTime);
        wait(1);
        let crowdsale = await WhitelistedCrowdsale.at(await controller_instance.crowdsale.call());

        for (let i = 0; i < 22; i++) {
            await crowdsale.sendTransaction({from: buyerAddress, value: web3.toWei(200, 'ether')});
        }
        wait(5);
        try {
            await controller_instance.refund({from: buyerAddress});
            assert.ifError('Error, it is possible to refund if Softcup reached');
        } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert', "Expected revert error after refund");
        }


        let expectedHalfEscrowAmount = BigNumber(web3.toWei(2360, 'ether'));
        await controller_instance.finishCrowdsale();
        await controller_instance.finishCrowdsaleBurnUnused();
        let actualEscrowBalance = BigNumber(await web3.eth.getBalance(escrowAddress))
            .minus(escrowAddressInitialBalance);
        assert.isTrue(actualEscrowBalance.isEqualTo(expectedHalfEscrowAmount), "Wrong amount of ether at escrow balance");
        assert.isTrue(BigNumber(await web3.eth.getBalance(holder.address)).isEqualTo(expectedHalfEscrowAmount), "Wrong amount of ether at holder balance");

        let controllerTokenBalance = BigNumber(await token.balanceOf(controller_instance.address));
        let marketingSupportTokens = BigNumber(await controller_instance.MARKETING_SUPPORT_SUPPLY.call());
        assert.isTrue(controllerTokenBalance.isEqualTo(marketingSupportTokens), "Wrong amount of token at controller");
        assert.isTrue(await controller_instance.crowdsaleFinished.call(), "Wrong value of crowdsaleFinished variable");
        let expectedTokenHolderBalance = BigNumber(await controller_instance.INCENTIVE_PROGRAM_SUPPORT.call());
        let actualTokenHolderBalance = BigNumber(await token.balanceOf(tokenHolder.address));
        assert.isTrue(expectedTokenHolderBalance.isEqualTo(actualTokenHolderBalance), "Wrong token balance of token Holder");


        await holder.escrowFirstStage({from: accounts[1]});
        await holder.escrowFirstStage({from: accounts[2]});
        expectedHalfEscrowAmount = BigNumber(web3.toWei(3776, 'ether'));
        actualEscrowBalance = BigNumber(await web3.eth.getBalance(escrowAddress))
            .minus(escrowAddressInitialBalance);
        assert.isTrue(actualEscrowBalance.isEqualTo(expectedHalfEscrowAmount), "Wrong amount of ether at escrow address after holder first stage escrow");

        await holder.escrowSecondStage({from: accounts[1]});
        await holder.escrowSecondStage({from: accounts[2]});
        expectedHalfEscrowAmount = BigNumber(web3.toWei(4720, 'ether'));
        actualEscrowBalance = BigNumber(await web3.eth.getBalance(escrowAddress))
            .minus(escrowAddressInitialBalance);
        assert.isTrue(actualEscrowBalance.isEqualTo(expectedHalfEscrowAmount), "Wrong amount of ether at escrow address after holder second stage escrow");

        //check transfer no error
        try {
            await token.transfer(accounts[0], 10, {from:buyerAddress});
        } catch (err){
            assert.ifError('Error, it is impossible to transfer tokens after ICO end');
        }
    });
});

contract("ICO Increase time", async function () {
    it('test increaseCurrentIcoEndTime functions', async function () {
        let controller_instance = await Controller.deployed();
        let startTime = Math.ceil(Date.now() / 1000);
        let endTime = Math.ceil(Date.now() / 1000);
        await controller_instance.startPrivateOffer(
            startTime,
            endTime,
            controller_instance.address);
        let privateOffer = await WhitelistedCrowdsale.at(await controller_instance.privateOffer.call());
        try {
            await controller_instance.increaseCurrentIcoEndTime(endTime);
            assert.ifError('Error, it is possible to increase time that not greater then current');
        } catch (err) {
            assert.equal(err, 'Error: VM Exception while processing transaction: revert', "it is possible to increase time that not greater then current");
        }
        let endTimeUpdated = endTime + 1;
        await controller_instance.increaseCurrentIcoEndTime(endTimeUpdated);
        let actualEndTime = await privateOffer.endTime.call();
        assert.equal(endTimeUpdated, actualEndTime, "Wrong updated endtime for private offer");
        wait(3);

        startTime = Math.ceil(Date.now() / 1000);
        endTime = Math.ceil(Date.now() / 1000);
        await controller_instance.startPreSaleIco(
            startTime,
            endTime);
        let preSale = await WhitelistedCrowdsale.at(await controller_instance.preSale.call());
        endTimeUpdated = endTime + 1;
        await controller_instance.increaseCurrentIcoEndTime(endTimeUpdated);
        actualEndTime = await preSale.endTime.call();
        assert.equal(endTimeUpdated, actualEndTime, "Wrong updated endtime for presale");
        wait(3);

        startTime = Math.ceil(Date.now() / 1000);
        endTime = Math.ceil(Date.now() / 1000);
        await controller_instance.startCrowdsale(
            startTime,
            endTime);
        let crowdsale = await WhitelistedCrowdsale.at(await controller_instance.crowdsale.call());
        endTimeUpdated = endTime + 1;
        await controller_instance.increaseCurrentIcoEndTime(endTimeUpdated);
        actualEndTime = await crowdsale.endTime.call();
        assert.equal(endTimeUpdated, actualEndTime, "Wrong updated endtime for crowdsale");
    });
});
