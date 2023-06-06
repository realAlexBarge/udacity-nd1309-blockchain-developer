var Test = require("../config/testConfig.js");
var BigNumber = require("bignumber.js");

const TEN_ETHER = "10000000000000000000";

contract("Flight Surety Tests", async (accounts) => {
  var config;
  var app;
  var data;

  before("setup contract", async () => {
    config = await Test.Config(accounts);

    app = config.flightSuretyApp;
    data = config.flightSuretyData;

    await data.authorizeCaller(app.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {
    // Get operating status
    let status = await data.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await data.setOperatingStatus(false, {
        from: config.testAddresses[2],
      });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await data.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(
      accessDenied,
      false,
      "Access not restricted to Contract Owner"
    );
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    await data.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSurety.setTestingMode(true);
    } catch (e) {
      console.log(e);
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await data.setOperatingStatus(true);
  });

  it("(airline) first airline is registered with deployed contract", async () => {
    const result = await data.isAirlineRegistered(config.firstAirline);

    // ASSERT
    assert.equal(result, true, "First Airline not registered");
  });

  it("(airline) cannot register an Airline using registerAirline() if it is not funded", async () => {
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await app.registerAirline(newAirline, "New Airline", {
        from: config.firstAirline,
      });
    } catch (e) {}
    let result = await data.isAirlineActive.call(newAirline);

    // ASSERT
    assert.equal(
      result,
      false,
      "Airline should not be able to register another airline if it hasn't provided funding"
    );
  });

  it("(airline) airline can add funding, but not active until 10 ether provided", async () => {
    const activeBefore = await data.isAirlineActive(config.firstAirline);
    await app.addFundingToAirline({
      from: config.firstAirline,
      value: TEN_ETHER / 10,
    });

    const activeAfter = await data.isAirlineActive(config.firstAirline);

    // ASSERT
    assert.equal(activeBefore, false, "Airline active before funding");
    assert.equal(
      activeAfter,
      false,
      "Airline active after funding, even though not enough"
    );
  });

  it("(airline) airline active after fully funded", async () => {
    const activeBefore = await data.isAirlineActive(config.firstAirline);

    await app.addFundingToAirline({
      from: config.firstAirline,
      value: TEN_ETHER,
    });

    const activeAfter = await data.isAirlineActive(config.firstAirline);

    // ASSERT
    assert.equal(activeBefore, false, "Airline active before funding");
    assert.equal(activeAfter, true, "Airline not active after funding");
  });

  it("(airline) airline can register new airlines while below four when funded", async () => {
    let registerdBefore = new BigNumber(
      await data.getNumOfRegisteredAirlines()
    ).toNumber();

    for (let i = 2; i < 7; i++) {
      await app.registerAirline(accounts[i], "Airline " + (i - 1), {
        from: config.firstAirline,
      });
    }

    let registerdAfter = new BigNumber(
      await data.getNumOfRegisteredAirlines()
    ).toNumber();

    // ASSERT
    assert.equal(registerdBefore, 1, "More than 1 airline registered at start");
    assert.equal(registerdAfter, 4, "More or less than 4 airliness registered");
  });

  it("(airline) airline can register fifth airline with multi party consensus", async () => {
    let registerdBefore = new BigNumber(
      await data.getNumOfRegisteredAirlines()
    ).toNumber();

    assert.equal(registerdBefore, 4, "More than 4 airlines registered");

    await app.registerAirline(accounts[5], "Airline 5", {
      from: config.firstAirline,
    });

    for (let i = 2; i < 5; i++) {
      // add funding to airlines to activate them
      await app.addFundingToAirline({
        from: accounts[i],
        value: TEN_ETHER,
      });

      // add vote to new airline
      await app.addVoteToAirline(accounts[5], {
        from: accounts[i],
      });
    }

    let registerdAfter = new BigNumber(
      await data.getNumOfRegisteredAirlines()
    ).toNumber();

    // ASSERT
    assert.equal(
      registerdAfter,
      5,
      "More or less than 5 airlines registered at start"
    );
  });

  it("(passenger) can buy insurance and get payout when delayed", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const passenger = accounts[10];

    await app.purchaseInsurance(config.firstAirline, "TEST", timestamp, {
      from: passenger,
      value: TEN_ETHER / 10,
    });

    await data.authorizeCaller(accounts[0]);

    await data.creditInsurees(config.firstAirline, "TEST", timestamp);

    let firstPayout = false;

    try {
      firstPayout = await app.withdraw({ from: passenger });
    } catch (e) {}

    assert.notEqual(firstPayout, false, "Payout transaction not successful");

    let secondPayout = false;

    try {
      secondPayout = await app.withdraw({ from: passenger });
    } catch (e) {}

    assert.equal(secondPayout, false, "Subsequent payout not undefined");
  });
});
