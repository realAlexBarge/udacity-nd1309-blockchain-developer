const HDWalletProvider = require("truffle-hdwallet-provider");

const { mnemonic, infuraKey } = require("./env.js");

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*", // Match any network id
    },
    sepolia: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          `https://sepolia.infura.io/v3/${infuraKey}`
        ),
      network_id: 11155111, // rinkeby's id
      gas: 4500000, // rinkeby has a lower block limit than mainnet
      gasPrice: 10000000000,
    },
    goerli: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          `https://goerli.infura.io/v3/${infuraKey}`
        ),
      network_id: 5,
      gas: 4500000, // rinkeby has a lower block limit than mainnet
      gasPrice: 10000000000,
    },
  },
};
