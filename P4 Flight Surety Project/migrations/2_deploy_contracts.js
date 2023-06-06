const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require("fs");

module.exports = async function (deployer) {
  let firstAirlineAddress = "0x209586DfE22dB9f1c2F54aA8F449b2Ba9C196f84";
  let firstAirlineName = "Fly First";

  await deployer.deploy(
    FlightSuretyData,
    firstAirlineAddress,
    firstAirlineName
  );

  const flightSuretyData = await FlightSuretyData.deployed();

  await deployer.deploy(FlightSuretyApp, flightSuretyData.address);

  const flightSuretyApp = await FlightSuretyApp.deployed();

  await flightSuretyData.authorizeCaller.sendTransaction(
    flightSuretyApp.address
  );

  const config = {
    localhost: {
      url: "http://127.0.0.1:8545",
      dataAddress: flightSuretyData.address,
      appAddress: flightSuretyApp.address,
    },
  };

  fs.writeFileSync(
    __dirname + "/../src/dapp/config.json",
    JSON.stringify(config, null, "\t"),
    "utf-8"
  );

  fs.writeFileSync(
    __dirname + "/../src/server/config.json",
    JSON.stringify(config, null, "\t"),
    "utf-8"
  );
};
