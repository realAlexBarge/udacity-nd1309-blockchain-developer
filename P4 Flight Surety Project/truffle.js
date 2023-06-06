var HDWalletProvider = require("@truffle/hdwallet-provider");
var mnemonic =
  "mechanic identify buddy guess table bless dove basic possible butter town bus";

module.exports = {
  networks: {
    development: {
      provider: function () {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
      },
      network_id: "*",
    },
  },
  compilers: {
    solc: {
      version: "0.8.19",
    },
  },
};
