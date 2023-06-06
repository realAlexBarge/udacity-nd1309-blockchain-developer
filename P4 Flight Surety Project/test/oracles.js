var Test = require("../config/testConfig.js");

contract("Oracles", async (accounts) => {
  const ACCOUNT_OFFSET = 5;
  const TEST_ORACLES_COUNT = 5 + ACCOUNT_OFFSET;

  // Watch contract events
  const STATUS_CODE_UNKNOWN = 0;
  const STATUS_CODE_ON_TIME = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;
  const STATUS_CODE_LATE_WEATHER = 30;
  const STATUS_CODE_LATE_TECHNICAL = 40;
  const STATUS_CODE_LATE_OTHER = 50;

  var config;
  var app;
  var data;

  before("setup contract", async () => {
    config = await Test.Config(accounts);

    app = config.flightSuretyApp;
    data = config.flightSuretyData;
  });

  it("can register oracles", async () => {
    // ARRANGE
    let fee = await app.REGISTRATION_FEE.call();

    // ACT
    for (let a = ACCOUNT_OFFSET; a < TEST_ORACLES_COUNT; a++) {
      if (accounts[a] != undefined) {
        await app.registerOracle({
          from: accounts[a],
          value: fee,
        });
      }
    }
  });

  it("can get indexes of oracles", async () => {
    // ACT
    const index = await app.getMyIndexes({
      from: accounts[ACCOUNT_OFFSET],
    });

    assert.notEqual(index, null, "Oracle index is null");
  });

  it("can request flight status", async () => {
    // ARRANGE
    let flight = "ND1309"; // Course number
    let timestamp = Math.floor(Date.now() / 1000);

    // Submit a request for oracles to get status information for a flight
    await app.fetchFlightStatus(config.firstAirline, flight, timestamp);
    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for (let a = ACCOUNT_OFFSET; a < TEST_ORACLES_COUNT; a++) {
      // Get oracle information
      let oracleIndexes = await app.getMyIndexes.call({
        from: accounts[a],
      });
      for (let idx = 0; idx < 3; idx++) {
        try {
          // Submit a response...it will only be accepted if there is an Index match
          await app.submitOracleResponse(
            oracleIndexes[idx],
            config.firstAirline,
            flight,
            timestamp,
            10,
            { from: accounts[a] }
          );
        } catch (e) {}
      }
    }
  });
});
