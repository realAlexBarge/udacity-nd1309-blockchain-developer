import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import FlightSuretyData from "../../build/contracts/FlightSuretyData.json";
import Config from "./config.json";
import Web3 from "web3";
import express from "express";

let config = Config["localhost"];

let web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);

web3.eth.net
  .isListening()
  .then(() => console.log("is connected"))
  .catch((e) => console.log("Wow. Something went wrong: " + e));

let flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
);

let flightSuretyData = new web3.eth.Contract(
  FlightSuretyData.abi,
  config.dataAddress
);

const STATUS_CODES = [0, 10, 20, 30, 40, 50];

const TEST_ORACLES_COUNT = 30;

const oracles = [];

const gas = 450000;

const fee = Web3.utils.toWei("1", "ether");

web3.eth.getAccounts(async (error, accounts) => {
  if (error) console.log(error);

  console.log("Creating oracles..");

  for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
    const address = accounts[a];

    if (address) {
      await flightSuretyApp.methods.registerOracle().send({
        from: address,
        value: fee,
        gas,
      });

      const index = await flightSuretyApp.methods
        .getMyIndexes()
        .call({ from: address });

      const oracle = { address, index };

      oracles.push(oracle);

      console.log("Registered Oracle " + a + ":" + JSON.stringify(oracle));
    }
  }
});

flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0,
  },
  async (error, event) => {
    if (error) console.log(error);

    const { index, airline, flight, timestamp } = event.returnValues;

    const randomStatus =
      STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)];

    oracles.forEach(async (oracle) => {
      if (oracle && oracle.index.includes(index)) {
        console.log(
          "Subbmitting oracle response: " +
            JSON.stringify({ index, airline, flight, timestamp, randomStatus })
        );
        await flightSuretyApp.methods
          .submitOracleResponse(index, airline, flight, timestamp, randomStatus)
          .send({
            from: oracle.address,
            gas: gas,
          });
      }
    });
  }
);

// Capturing events for debugging
flightSuretyApp.events
  .allEvents({
    fromBlock: "latest",
  })
  .on("connected", function (subscriptionId) {
    console.info("connected: ", subscriptionId);
  })
  .on("data", function (result) {
    console.log("Captured Event: ", result.event);
    console.log("Returned Values: ", result.returnValues);
  })
  .on("error", function (error, receipt) {
    console.error(error);
  });

flightSuretyData.events
  .allEvents({
    fromBlock: "latest",
  })
  .on("connected", function (subscriptionId) {
    console.info("connected: ", subscriptionId);
  })
  .on("data", function (result) {
    console.log("Captured Event: ", result.event);
    console.log("Returned Values: ", result.returnValues);
  })
  .on("error", function (error, receipt) {
    console.error(error);
  });

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

export default app;
