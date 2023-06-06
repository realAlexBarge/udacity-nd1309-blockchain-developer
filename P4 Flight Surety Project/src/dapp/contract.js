import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";

export default class Contract {
  constructor(network, callback) {
    let config = Config[network];

    // this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.web3 = new Web3(
      new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
    );

    this.gas = 450000;

    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    );
    this.owner = null;
    this.airlines = [];
    this.passengers = [];
    this.initialize(callback);
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      this.owner = accts[0];

      let counter = 1;

      while (this.airlines.length < 5) {
        this.airlines.push(accts[counter++]);
      }

      while (this.passengers.length < 5) {
        this.passengers.push(accts[counter++]);
      }

      callback();
    });
  }

  isOperational(callback) {
    let self = this;
    self.flightSuretyApp.methods
      .isOperational()
      .call({ from: self.owner }, callback);
  }

  fetchFlightStatus(flight, callback) {
    let self = this;
    let payload = {
      airline: self.airlines[0],
      flight: flight,
      timestamp: Math.floor(Date.now() / 1000),
    };

    self.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: self.owner }, (error, result) => {
        console.log(result);
        callback(error, payload);
      });
  }

  purchaseInsurance(flight, timestamp, value, callback) {
    let self = this;

    let payload = {
      airline: self.airlines[0],
      flight: flight,
      timestamp: self.web3.utils.toBN(timestamp),
    };

    self.flightSuretyApp.methods
      .purchaseInsurance(payload.airline, payload.flight, payload.timestamp)
      .send(
        {
          from: self.passengers[0],
          value: self.web3.utils.toWei(value, "ether"),
          gas: self.gas,
        },
        (error, result) => {
          console.log(result);
          callback(error, payload);
        }
      );
  }
}
